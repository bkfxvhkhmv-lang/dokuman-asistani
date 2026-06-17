"""Unit tests for PaddleOCR result parsing (no Paddle runtime required)."""

from app.services.ocr import _parse_ocr_page_result


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
