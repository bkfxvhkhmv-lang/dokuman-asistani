"""Unit tests for decision_worker shadow-mode instrumentation (#164-B)."""
import json
from unittest.mock import MagicMock, patch

import pytest

from app.workers import decision_worker as dw


LLM_RESULT = {
    "titel": "Vodafone Rechnung",
    "zusammenfassung": "Monatliche Rechnung",
    "kurzfassung": "93,01 EUR",
    "typ": "Rechnung",
    "risiko": "mittel",
    "betrag": 93.01,
    "frist": "2026-07-15",
    "iban": None,
    "aktionen": ["zahlen"],
    "warnung": None,
}

PARSER_RESULT = {
    "titel": "Rechnung Vodafone",
    "typ": "Rechnung",
    "absender": "Vodafone GmbH",
    "betrag": 93.01,
    "frist": "2026-07-15",
    "risiko": "mittel",
    "aktionen": ["zahlen"],
    "confidence": 0.85,
}

RAW_TEXT = "Vodafone Rechnung 93,01 EUR Frist 15.07.2026"


def _settings(shadow_mode: bool = False) -> MagicMock:
    settings = MagicMock()
    settings.extraction_shadow_mode = shadow_mode
    return settings


def _shadow_log_calls(mock_log_info):
    return [c for c in mock_log_info.call_args_list if c.args and c.args[0] == "extraction.shadow_compare"]


def _flatten_log_payload(kwargs: dict) -> str:
    return json.dumps(kwargs, default=str)


@pytest.mark.parametrize(
    ("confidence", "expected"),
    [
        (0.85, "HIGH"),
        (0.80, "HIGH"),
        (0.79, "MEDIUM"),
        (0.60, "MEDIUM"),
        (0.59, "LOW"),
        (None, "UNKNOWN"),
    ],
)
def test_parser_gate_state(confidence, expected):
    assert dw._parser_gate_state(confidence) == expected


def test_field_diff_amount_same_within_tolerance():
    diffs = dw._compute_field_diffs(
        {"amount": 93.01, "sender_present": False, "next_action": None},
        {"amount": 93.009, "sender_present": False, "next_action": None},
    )
    assert diffs["amount"] == "same"


def test_field_diff_sender_presence_only():
    diffs = dw._compute_field_diffs(
        {"sender_present": True},
        {"sender_present": False},
    )
    assert diffs["sender"] == "parser_only"


@patch("app.workers.decision_worker._save_meta")
@patch("app.workers.decision_worker.asyncio.run")
@patch("app.config.get_settings")
@patch("app.services.local_document_parser.parse_local_document_dict")
def test_shadow_flag_off_skips_parser_and_shadow_log(
    mock_parse,
    mock_get_settings,
    mock_asyncio_run,
    mock_save_meta,
):
    mock_get_settings.return_value = _settings(shadow_mode=False)
    mock_asyncio_run.return_value = LLM_RESULT

    with patch.object(dw.log, "info") as mock_log_info:
        result = dw.process_decision.run("doc-off", RAW_TEXT)

    assert result == LLM_RESULT
    mock_parse.assert_not_called()
    assert _shadow_log_calls(mock_log_info) == []
    mock_save_meta.assert_called_once_with("doc-off", LLM_RESULT)


@patch("app.workers.decision_worker._save_meta")
@patch("app.workers.decision_worker.asyncio.run")
@patch("app.config.get_settings")
@patch("app.services.local_document_parser.parse_local_document_dict")
def test_shadow_flag_on_calls_parser_and_logs_compare(
    mock_parse,
    mock_get_settings,
    mock_asyncio_run,
    mock_save_meta,
):
    mock_get_settings.return_value = _settings(shadow_mode=True)
    mock_parse.return_value = PARSER_RESULT
    mock_asyncio_run.return_value = LLM_RESULT

    with patch.object(dw.log, "info") as mock_log_info:
        result = dw.process_decision.run("doc-on", RAW_TEXT)

    assert result == LLM_RESULT
    mock_parse.assert_called_once_with(RAW_TEXT)
    mock_save_meta.assert_called_once_with("doc-on", LLM_RESULT)

    shadow_calls = _shadow_log_calls(mock_log_info)
    assert len(shadow_calls) == 1
    payload = shadow_calls[0].kwargs
    assert payload["document_id"] == "doc-on"
    assert payload["shadow_mode"] is True
    assert payload["applied_source"] == "current_production_llm"
    assert payload["parser_confidence"] == 0.85
    assert payload["parser_gate_state"] == "HIGH"
    assert payload["parser_snapshot"]["document_type"] == "Rechnung"
    assert payload["llm_snapshot"]["document_type"] == "Rechnung"
    assert payload["parser_snapshot"]["sender_present"] is True
    assert "absender" not in payload["parser_snapshot"]
    assert payload["field_diffs"]["amount"] == "same"


@patch("app.workers.decision_worker._save_meta")
@patch("app.workers.decision_worker.asyncio.run")
@patch("app.config.get_settings")
@patch("app.services.local_document_parser.parse_local_document_dict")
def test_shadow_flag_on_save_meta_receives_llm_not_parser(
    mock_parse,
    mock_get_settings,
    mock_asyncio_run,
    mock_save_meta,
):
    mock_get_settings.return_value = _settings(shadow_mode=True)
    mock_parse.return_value = PARSER_RESULT
    mock_asyncio_run.return_value = LLM_RESULT

    dw.process_decision.run("doc-llm", RAW_TEXT)

    saved = mock_save_meta.call_args[0][1]
    assert saved["typ"] == "Rechnung"
    assert saved["betrag"] == 93.01
    assert saved["titel"] == "Vodafone Rechnung"
    assert saved.get("confidence") is None


@patch("app.workers.decision_worker._save_meta")
@patch("app.workers.decision_worker.asyncio.run")
@patch("app.config.get_settings")
@patch("app.services.local_document_parser.parse_local_document_dict")
def test_parser_failure_still_saves_llm_and_logs_parser_error(
    mock_parse,
    mock_get_settings,
    mock_asyncio_run,
    mock_save_meta,
):
    mock_get_settings.return_value = _settings(shadow_mode=True)
    mock_parse.side_effect = RuntimeError("parser boom")
    mock_asyncio_run.return_value = LLM_RESULT

    with patch.object(dw.log, "info") as mock_log_info:
        dw.process_decision.run("doc-parser-fail", RAW_TEXT)

    mock_save_meta.assert_called_once_with("doc-parser-fail", LLM_RESULT)
    payload = _shadow_log_calls(mock_log_info)[0].kwargs
    assert payload["errors"]["parser_error_type"] == "RuntimeError"
    assert payload["parser_snapshot"] is None
    assert payload["parser_gate_state"] == "UNKNOWN"


@patch("app.workers.decision_worker._save_meta")
@patch("app.workers.decision_worker.asyncio.run")
@patch("app.config.get_settings")
@patch("app.services.local_document_parser.parse_local_document_dict")
def test_shadow_log_does_not_contain_raw_text_or_sender_string(
    mock_parse,
    mock_get_settings,
    mock_asyncio_run,
    mock_save_meta,
):
    mock_get_settings.return_value = _settings(shadow_mode=True)
    mock_parse.return_value = PARSER_RESULT
    mock_asyncio_run.return_value = LLM_RESULT

    with patch.object(dw.log, "info") as mock_log_info:
        dw.process_decision.run("doc-pii", RAW_TEXT)

    payload = _shadow_log_calls(mock_log_info)[0].kwargs
    serialized = _flatten_log_payload(payload)
    assert RAW_TEXT not in serialized
    assert "Vodafone GmbH" not in serialized
    assert payload["parser_snapshot"]["sender_present"] is True
    assert "sender" not in payload["parser_snapshot"] or isinstance(
        payload["parser_snapshot"].get("sender_present"), bool
    )


@patch("app.workers.decision_worker._emit_shadow_compare")
@patch("app.workers.decision_worker._save_meta")
@patch("app.workers.decision_worker.asyncio.run")
@patch("app.config.get_settings")
@patch("app.services.local_document_parser.parse_local_document_dict")
def test_shadow_log_failure_does_not_break_task(
    mock_parse,
    mock_get_settings,
    mock_asyncio_run,
    mock_save_meta,
    mock_emit_shadow,
):
    mock_get_settings.return_value = _settings(shadow_mode=True)
    mock_parse.return_value = PARSER_RESULT
    mock_asyncio_run.return_value = LLM_RESULT
    mock_emit_shadow.side_effect = RuntimeError("log boom")

    result = dw.process_decision.run("doc-log-fail", RAW_TEXT)

    assert result == LLM_RESULT
    mock_save_meta.assert_called_once_with("doc-log-fail", LLM_RESULT)
