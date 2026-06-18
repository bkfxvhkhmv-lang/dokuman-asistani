"""Tests for LLM extraction usage telemetry."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.llm_usage import estimate_cost_usd, emit_extraction_usage


def test_estimate_cost_usd_known_model():
    cost = estimate_cost_usd("gpt-4o-mini", 1_000_000, 500_000)
    assert cost == pytest.approx(0.15 + 0.30)


def test_estimate_cost_usd_unknown_model_returns_none():
    assert estimate_cost_usd("unknown-model-xyz", 100, 50) is None


@patch("app.services.llm_usage.log_llm_usage")
def test_emit_extraction_usage_skips_without_document_id(mock_log):
    emit_extraction_usage(
        document_id=None,
        route="decision_worker",
        provider="anthropic",
        model="claude-haiku-4-5-20251001",
        input_tokens=100,
        output_tokens=50,
        total_tokens=150,
        latency_ms=12.3,
    )
    mock_log.assert_not_called()


@patch("app.services.llm_usage.log_llm_usage")
def test_emit_extraction_usage_logs_scalar_fields(mock_log):
    emit_extraction_usage(
        document_id="doc-abc",
        route="decision_worker",
        provider="anthropic",
        model="claude-haiku-4-5-20251001",
        input_tokens=1000,
        output_tokens=200,
        total_tokens=1200,
        latency_ms=321.44,
    )
    mock_log.assert_called_once()
    kwargs = mock_log.call_args.kwargs
    assert kwargs["document_id"] == "doc-abc"
    assert kwargs["route"] == "decision_worker"
    assert kwargs["provider"] == "anthropic"
    assert kwargs["input_tokens"] == 1000
    assert kwargs["output_tokens"] == 200
    assert kwargs["total_tokens"] == 1200
    assert kwargs["estimated_cost_usd"] == pytest.approx(0.002)
    assert kwargs["latency_ms"] == 321.44


@patch("app.services.llm_usage.log_llm_usage")
def test_emit_extraction_usage_unknown_model_cost_null(mock_log):
    emit_extraction_usage(
        document_id="doc-xyz",
        route="ai_explain",
        provider="openai",
        model="gpt-unknown",
        input_tokens=10,
        output_tokens=5,
        total_tokens=15,
        latency_ms=50.0,
    )
    assert mock_log.call_args.kwargs["estimated_cost_usd"] is None


@patch("app.services.llm.parse_explain_json", return_value={"titel": "T"})
@patch("app.services.llm.persist_usage_event", new_callable=AsyncMock)
@patch("app.services.llm.emit_extraction_usage")
async def test_anthropic_explain_emits_usage_when_routed(mock_emit, _mock_persist, _mock_parse):
    from app.services.llm import AnthropicProvider

    provider = AnthropicProvider.__new__(AnthropicProvider)
    provider.model = "claude-haiku-4-5-20251001"
    usage = MagicMock(input_tokens=120, output_tokens=80)
    resp = MagicMock(usage=usage, content=[MagicMock(type="text", text='{"titel":"T"}')])
    provider.client = MagicMock()
    provider.client.messages.create = AsyncMock(return_value=resp)

    await provider.explain(
        "sample text",
        document_id="doc-1",
        route="decision_worker",
    )

    mock_emit.assert_called_once()
    assert mock_emit.call_args.kwargs["document_id"] == "doc-1"
    assert mock_emit.call_args.kwargs["route"] == "decision_worker"
    assert mock_emit.call_args.kwargs["input_tokens"] == 120
    assert mock_emit.call_args.kwargs["output_tokens"] == 80
