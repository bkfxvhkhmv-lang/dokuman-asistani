"""Unit tests for PaddleOCR result parsing (no Paddle runtime required)."""

from unittest.mock import MagicMock

from app.services.ocr import (
    _is_meaningful_text_layer,
    _parse_ocr_page_result,
    run_ocr,
)


def test_parse_ppocrv5_dict_like_rec_texts():
    page = {
        "rec_texts": ["Johannes Töx", "106,96 EUR"],
        "rec_scores": [0.99, 0.97],
        "dt_polys": [[[0, 0], [1, 0], [1, 1], [0, 1]], [[2, 2], [3, 2], [3, 3], [2, 3]]],
    }
    lines, confidences, blocks = _parse_ocr_page_result(page)

    assert lines == ["Johannes Töx", "106,96 EUR"]
    assert confidences == [0.99, 0.97]
    assert len(blocks) == 2
    assert blocks[0]["text"] == "Johannes Töx"
    assert blocks[0]["confidence"] == 0.99


def test_parse_paddleocr_v2_tuple_format():
    page = [
        [[[0, 0], [1, 0], [1, 1], [0, 1]], ("Hello", 0.95)],
        [[[2, 2], [3, 2], [3, 3], [2, 3]], ("World", 0.88)],
    ]
    lines, confidences, blocks = _parse_ocr_page_result(page)

    assert lines == ["Hello", "World"]
    assert confidences == [0.95, 0.88]
    assert len(blocks) == 2


def test_parse_paddleocr_v3_list_format():
    page = [
        [[[0, 0], [1, 0], [1, 1], [0, 1]], "Hallo", 0.91],
    ]
    lines, confidences, blocks = _parse_ocr_page_result(page)

    assert lines == ["Hallo"]
    assert confidences == [0.91]
    assert blocks[0]["text"] == "Hallo"


def test_is_meaningful_text_layer_by_char_count():
    assert _is_meaningful_text_layer("x" * 200)
    assert not _is_meaningful_text_layer("x" * 199)


def test_is_meaningful_text_layer_by_token_count():
    twenty_tokens = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty"
    assert _is_meaningful_text_layer(twenty_tokens)

    nineteen_tokens = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen"
    assert not _is_meaningful_text_layer(nineteen_tokens)


def test_run_ocr_pdf_text_layer_skips_paddle(monkeypatch):
    pdf_bytes = b"%PDF-1.4"
    layer_text = "Johannes Töx\nSchornsteinfeger\n" + ("detail " * 30)

    monkeypatch.setattr("app.services.ocr._extract_pdf_text_layer", lambda _b: layer_text)

    def _fail_get_engine():
        raise AssertionError("PaddleOCR must not run when text layer is meaningful")

    monkeypatch.setattr("app.services.ocr._get_engine", _fail_get_engine)

    result = run_ocr(pdf_bytes)

    assert "Johannes" in result.text
    assert result.confidence == 1.0
    assert result.blocks == []


def test_run_ocr_pdf_empty_text_layer_falls_back_to_paddle(monkeypatch):
    pdf_bytes = b"%PDF-1.4"

    monkeypatch.setattr("app.services.ocr._extract_pdf_text_layer", lambda _b: "")

    fake_img = MagicMock()
    fake_img.size = (100, 100)
    monkeypatch.setattr("app.services.ocr._pil_rgb_from_blob", lambda _b: fake_img)
    monkeypatch.setattr("app.services.ocr._limit_max_side", lambda img, _max: img)
    monkeypatch.setattr("numpy.array", lambda _img: [[0]])

    class FakeEngine:
        def ocr(self, img_array, cls=True):
            return [
                [
                    [[[0, 0], [1, 0], [1, 1], [0, 1]], ("Fallback OCR", 0.9)],
                ]
            ]

    monkeypatch.setattr("app.services.ocr._get_engine", lambda: FakeEngine())

    result = run_ocr(pdf_bytes)

    assert result.text == "Fallback OCR"
    assert result.confidence == 0.9


def test_is_meaningful_text_layer_short_text_not_meaningful():
    """Regression (#145): 29 chars / 5 tokens must not qualify for text-layer fast path."""
    short_29_chars_5_tokens = "12345 12345 12345 12345 12345"
    assert len(short_29_chars_5_tokens.strip()) == 29
    assert len(short_29_chars_5_tokens.split()) == 5
    assert not _is_meaningful_text_layer(short_29_chars_5_tokens)


def test_run_ocr_pdf_short_text_layer_falls_back_to_paddle(monkeypatch):
    """Regression (#145): thin embedded text layer → Paddle, not fast path."""
    pdf_bytes = b"%PDF-1.4"
    layer_text = "12345 12345 12345 12345 12345"  # 29 chars, 5 tokens

    monkeypatch.setattr("app.services.ocr._extract_pdf_text_layer", lambda _b: layer_text)
    assert not _is_meaningful_text_layer(layer_text)

    fake_img = MagicMock()
    fake_img.size = (100, 100)
    monkeypatch.setattr("app.services.ocr._pil_rgb_from_blob", lambda _b: fake_img)
    monkeypatch.setattr("app.services.ocr._limit_max_side", lambda img, _max: img)
    monkeypatch.setattr("numpy.array", lambda _img: [[0]])

    class FakeEngine:
        def ocr(self, img_array, cls=True):
            return [
                [
                    [[[0, 0], [1, 0], [1, 1], [0, 1]], ("Paddle fallback", 0.87)],
                ]
            ]

    monkeypatch.setattr("app.services.ocr._get_engine", lambda: FakeEngine())

    result = run_ocr(pdf_bytes)

    assert result.text == "Paddle fallback"
    assert result.confidence == 0.87
