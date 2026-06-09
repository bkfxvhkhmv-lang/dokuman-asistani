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

    lines: list[str] = []
    confidences: list[float] = []
    blocks: list[dict] = []

    for line in raw[0]:
        box, (text, conf) = line
        lines.append(text)
        confidences.append(conf)
        blocks.append({"text": text, "confidence": conf, "box": box})

    full_text = "\n".join(lines)
    avg_conf  = sum(confidences) / len(confidences) if confidences else 0.0

    return OcrResult(text=full_text, confidence=round(avg_conf, 4), blocks=blocks)
