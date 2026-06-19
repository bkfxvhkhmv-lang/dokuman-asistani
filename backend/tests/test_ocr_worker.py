"""Regression tests for OCR worker failure handling (#170)."""
from unittest.mock import MagicMock, patch

import pytest
from celery.exceptions import MaxRetriesExceededError

from app.workers import ocr_worker as ow


def test_process_ocr_marks_failed_on_final_retry():
    """When max retries are exhausted, the document must be marked failed."""
    self_mock = MagicMock()
    self_mock.request.retries = 3
    self_mock.max_retries = 3
    self_mock.retry.side_effect = MaxRetriesExceededError

    with (
        patch.object(ow, "_download", return_value=b"fake"),
        patch.object(
            ow,
            "run_ocr",
            side_effect=ValueError(
                "A string literal cannot contain NUL (0x00) characters."
            ),
        ),
        patch.object(ow, "_mark_failed") as mock_mark_failed,
    ):
        with pytest.raises(MaxRetriesExceededError):
            ow.process_ocr.__wrapped__.__func__(
                self_mock, "doc-fail-001", "user/doc-fail-001/file.pdf"
            )

    mock_mark_failed.assert_called_once_with(
        "doc-fail-001",
        "A string literal cannot contain NUL (0x00) characters.",
    )


def test_process_ocr_does_not_mark_failed_before_max_retries():
    """Intermediate retries must keep the document pending."""
    self_mock = MagicMock()
    self_mock.request.retries = 2
    self_mock.max_retries = 3
    self_mock.retry.side_effect = Exception("retry")

    with (
        patch.object(ow, "_download", return_value=b"fake"),
        patch.object(ow, "run_ocr", side_effect=ValueError("NUL")),
        patch.object(ow, "_mark_failed") as mock_mark_failed,
    ):
        with pytest.raises(Exception):
            ow.process_ocr.__wrapped__.__func__(
                self_mock, "doc-retry-001", "user/doc-retry-001/file.pdf"
            )

    mock_mark_failed.assert_not_called()


def test_save_text_strips_nul_bytes():
    """NUL characters in OCR output must not crash DB insert/update."""
    mock_conn = MagicMock()
    mock_engine = MagicMock()
    mock_engine.begin.return_value.__enter__.return_value = mock_conn

    with patch.object(ow, "_sync_engine", return_value=mock_engine):
        with patch.object(ow.log, "warning") as mock_warning:
            ow._save_text("doc-nul-001", "abc\x00def\x00ghi", 0.95)

    calls = mock_conn.execute.call_args_list
    _sql_arg, params_arg = calls[0].args
    assert params_arg["text"] == "abcdefghi"
    assert "\x00" not in params_arg["text"]
    assert mock_warning.call_count == 1
    assert mock_warning.call_args.kwargs["doc_id"] == "doc-nul-001"


def test_sanitize_text_helper_is_noop_for_clean_text():
    assert ow._sanitize_text_for_db("clean text") == "clean text"
