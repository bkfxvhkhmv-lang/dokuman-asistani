"""
OCR service using PaddleOCR.
Initialized once per worker process (lazy, GPU-optional).
"""
from __future__ import annotations
import io
from typing import NamedTuple
import structlog

from app.config import get_settings

log = structlog.get_logger()
settings = get_settings()

_ocr_engine = None


def _get_engine():
    global _ocr_engine
    if _ocr_engine is None:
        from paddleocr import PaddleOCR

        v = (settings.ocr_pipeline_version or "").strip()
        base_kw: dict = {"lang": settings.ocr_lang}
        if v:
            base_kw["ocr_version"] = v
        lite_kw = {
            **base_kw,
            "use_doc_orientation_classify": False,
            "use_doc_unwarping": False,
            "use_textline_orientation": False,
        }
        try:
            _ocr_engine = PaddleOCR(**lite_kw)
        except TypeError:
            _ocr_engine = PaddleOCR(**base_kw)
            log.warning("ocr.paddle_without_doc_pipeline_flags")

        log.info(
            "ocr.engine_initialized",
            lang=settings.ocr_lang,
            ocr_pipeline_version=v or "(default)",
        )
    return _ocr_engine


class OcrResult(NamedTuple):
    text:       str
    confidence: float
    blocks:     list[dict]


_TEXT_LAYER_MIN_CHARS = 50
_TEXT_LAYER_MIN_TOKENS = 5


def _is_pdf_blob(blob: bytes) -> bool:
    return len(blob) >= 4 and blob[:4] == b"%PDF"


def _extract_pdf_text_layer(blob: bytes) -> str:
    """Extract embedded text from PDF page 0 via PyMuPDF (no rasterization)."""
    import fitz  # pymupdf

    doc = fitz.open(stream=blob, filetype="pdf")
    try:
        if doc.page_count < 1:
            return ""
        return doc.load_page(0).get_text("text") or ""
    finally:
        doc.close()


def _is_meaningful_text_layer(text: str) -> bool:
    """Enough embedded text to skip PaddleOCR for digital PDFs."""
    stripped = text.strip()
    if len(stripped) >= _TEXT_LAYER_MIN_CHARS:
        return True
    tokens = [t for t in stripped.split() if t]
    return len(tokens) >= _TEXT_LAYER_MIN_TOKENS


def _parse_ocr_page_result(page_result) -> tuple[list[str], list[float], list[dict]]:
    """
    Normalize one page of PaddleOCR output into lines, confidences, blocks.

    PaddleOCR 3.x PP-OCRv5 returns an OCRResult dict-like object with rec_texts/rec_scores.
    Older versions return a list of [box, (text, conf)] or [box, text, conf] rows.
    """
    lines: list[str] = []
    confidences: list[float] = []
    blocks: list[dict] = []

    if page_result is None:
        return lines, confidences, blocks

    rec_texts = None
    rec_scores = None
    polys = None
    try:
        if hasattr(page_result, "keys") and "rec_texts" in page_result:
            getter = page_result.get if hasattr(page_result, "get") else page_result.__getitem__
            rec_texts = getter("rec_texts") or []
            rec_scores = getter("rec_scores") or []
            polys = getter("dt_polys") or getter("rec_polys") or []
    except (TypeError, KeyError, AttributeError):
        rec_texts = None

    if rec_texts is not None:
        for i, raw_text in enumerate(rec_texts):
            text = str(raw_text).strip() if raw_text is not None else ""
            if not text:
                continue
            try:
                conf = float(rec_scores[i]) if rec_scores and i < len(rec_scores) else 1.0
            except (TypeError, ValueError, IndexError):
                conf = 1.0
            box: list = []
            if polys and i < len(polys):
                poly = polys[i]
                try:
                    box = poly.tolist() if hasattr(poly, "tolist") else list(poly)
                except (TypeError, ValueError):
                    box = []
            lines.append(text)
            confidences.append(conf)
            blocks.append({"text": text, "confidence": conf, "box": box})
        return lines, confidences, blocks

    if not isinstance(page_result, (list, tuple)):
        log.warning("ocr.unrecognized_page_result", result_type=type(page_result).__name__)
        return lines, confidences, blocks

    for line in page_result:
        if not line or len(line) < 2:
            continue
        box = line[0]
        # PaddleOCR 2.x: line = [box, [text, conf]]
        # PaddleOCR 3.x list API: line = [box, text, conf]
        if isinstance(line[1], (list, tuple)):
            rec = line[1]
            text, conf = str(rec[0]), float(rec[1])
        else:
            text = str(line[1]) if line[1] is not None else ""
            try:
                conf = float(line[2]) if len(line) > 2 else 1.0
            except (TypeError, ValueError):
                conf = 1.0
        if not text:
            continue
        lines.append(text)
        confidences.append(conf)
        blocks.append({"text": text, "confidence": conf, "box": box})

    return lines, confidences, blocks


def _pil_rgb_from_blob(blob: bytes):
    """Open raster bytes with Pillow; rasterize PDF page 0 via PyMuPDF (PIL rarely decodes PDF to pixels)."""
    from PIL import Image

    if len(blob) >= 4 and blob[:4] == b"%PDF":
        import fitz  # pymupdf

        doc = fitz.open(stream=blob, filetype="pdf")
        try:
            if doc.page_count < 1:
                raise ValueError("PDF has no pages")
            page = doc.load_page(0)
            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), alpha=False)
            png_bytes = pix.tobytes("png")
        finally:
            doc.close()
        with Image.open(io.BytesIO(png_bytes)) as img:
            return img.convert("RGB")

    with Image.open(io.BytesIO(blob)) as img:
        return img.convert("RGB")


def _limit_max_side(rgb, max_side: int):
    """Shrink so max(width,height) ≤ max_side; keeps aspect ratio."""
    from PIL import Image

    if max_side <= 0:
        return rgb
    w, h = rgb.size
    if w < 1 or h < 1:
        raise ValueError("Decoded image has empty dimensions")
    m = max(w, h)
    if m <= max_side:
        return rgb
    scale = max_side / m
    nw, nh = max(2, int(w * scale)), max(2, int(h * scale))
    log.info("ocr.downscaled", before=(w, h), after=(nw, nh), max_side=max_side)
    return rgb.resize((nw, nh), Image.Resampling.LANCZOS)


def run_ocr(image_bytes: bytes) -> OcrResult:
    import numpy as np

    if _is_pdf_blob(image_bytes):
        try:
            layer_text = _extract_pdf_text_layer(image_bytes)
        except Exception as e:
            log.warning("ocr.text_layer_extract_failed", error=str(e))
            layer_text = ""
        if _is_meaningful_text_layer(layer_text):
            text = layer_text.strip()
            log.info("ocr.text_layer_fast_path", chars=len(text))
            return OcrResult(text=text, confidence=1.0, blocks=[])

    img = None
    try:
        img = _pil_rgb_from_blob(image_bytes)
    except Exception as e:
        log.warning("ocr.decode_failed", error=str(e))
        raise ValueError(f"Cannot decode image/PDF pixels for OCR: {e}") from e

    limited_img = _limit_max_side(img, settings.ocr_max_image_side)
    if limited_img is not img and img is not None:
        img.close()
    img = limited_img
    if max(img.size) < 8:
        log.warning("ocr.image_tiny", size=img.size)
    try:
        img_array = np.array(img)
    finally:
        img.close()

    engine = _get_engine()
    # PaddleOCR 3.x predict() rejects cls=; 2.x accepted ocr(ndarray, cls=True).
    try:
        raw = engine.ocr(img_array, cls=True)
    except TypeError as e:
        if "cls" not in str(e).lower():
            raise
        raw = engine.ocr(img_array)

    if not raw or not raw[0]:
        return OcrResult(text="", confidence=0.0, blocks=[])

    lines, confidences, blocks = _parse_ocr_page_result(raw[0])

    full_text = "\n".join(lines)
    avg_conf  = sum(confidences) / len(confidences) if confidences else 0.0

    return OcrResult(text=full_text, confidence=round(avg_conf, 4), blocks=blocks)
