"""
Focused tests for AI usage telemetry:
  - cost calculation (with/without cache tokens)
  - DB persistence helper
  - extraction path persists a row
  - DB insert failure does not break extraction
  - decision_worker + ai_explain produce separate rows
"""
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import sqlalchemy as sa
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

from app.services.llm_usage import (
    _persist_usage_sync,
    emit_extraction_usage,
    estimate_cost_usd,
    persist_usage_event,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sqlite_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE ai_usage_events (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                feature TEXT NOT NULL,
                route TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT,
                document_id TEXT,
                user_id TEXT,
                input_tokens INTEGER,
                output_tokens INTEGER,
                total_tokens INTEGER,
                cache_creation_input_tokens INTEGER,
                cache_read_input_tokens INTEGER,
                estimated_cost_usd REAL,
                latency_ms REAL,
                success INTEGER NOT NULL DEFAULT 1,
                error_type TEXT
            )
        """))
    return engine


def _query_all(engine):
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT * FROM ai_usage_events")).fetchall()
    return rows


# ── Cost calculation ──────────────────────────────────────────────────────────

def test_estimate_cost_usd_known_model_no_cache():
    cost = estimate_cost_usd("gpt-4o-mini", 1_000_000, 500_000)
    assert cost == pytest.approx(0.15 + 0.30)


def test_estimate_cost_usd_unknown_model_returns_none():
    assert estimate_cost_usd("unknown-model-xyz", 100, 50) is None


def test_estimate_cost_usd_with_cache_creation_tokens():
    # claude-haiku: input=$1.00/M, output=$5.00/M
    # cache_creation = 1.25 × input_rate → $1.25/M
    cost = estimate_cost_usd(
        "claude-haiku-4-5-20251001",
        input_tokens=0,
        output_tokens=0,
        cache_creation_input_tokens=1_000_000,
        cache_read_input_tokens=0,
    )
    assert cost == pytest.approx(1.25)


def test_estimate_cost_usd_with_cache_read_tokens():
    # cache_read = 0.10 × input_rate → $0.10/M
    cost = estimate_cost_usd(
        "claude-haiku-4-5-20251001",
        input_tokens=0,
        output_tokens=0,
        cache_creation_input_tokens=0,
        cache_read_input_tokens=1_000_000,
    )
    assert cost == pytest.approx(0.10)


def test_estimate_cost_usd_unknown_model_cache_tokens_returns_none():
    assert estimate_cost_usd("new-mystery-model", 500, 200, 100, 50) is None


# ── DB persistence ────────────────────────────────────────────────────────────

def test_persist_usage_sync_inserts_one_row():
    engine = _sqlite_engine()
    from datetime import datetime, timezone
    _persist_usage_sync(
        {
            "id": "test-id-001",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "feature": "extraction",
            "route": "decision_worker",
            "provider": "anthropic",
            "model": "claude-haiku-4-5-20251001",
            "document_id": "doc-abc",
            "user_id": None,
            "input_tokens": 120,
            "output_tokens": 80,
            "total_tokens": 200,
            "cache_creation_input_tokens": None,
            "cache_read_input_tokens": None,
            "estimated_cost_usd": 0.00052,
            "latency_ms": 321.5,
            "success": True,
            "error_type": None,
        },
        _engine=engine,
    )
    rows = _query_all(engine)
    assert len(rows) == 1
    row = rows[0]._mapping
    assert row["feature"] == "extraction"
    assert row["route"] == "decision_worker"
    assert row["provider"] == "anthropic"
    assert row["document_id"] == "doc-abc"
    assert row["input_tokens"] == 120
    assert row["output_tokens"] == 80
    assert row["total_tokens"] == 200
    assert float(row["estimated_cost_usd"]) == pytest.approx(0.00052)
    assert row["success"] == 1


async def test_persist_usage_event_async_inserts_row():
    engine = _sqlite_engine()
    await persist_usage_event(
        feature="extraction",
        route="ai_explain",
        provider="openai",
        model="gpt-4o-mini",
        document_id="doc-xyz",
        input_tokens=500,
        output_tokens=100,
        total_tokens=600,
        estimated_cost_usd=0.000135,
        latency_ms=88.3,
        _engine=engine,
    )
    rows = _query_all(engine)
    assert len(rows) == 1
    assert rows[0]._mapping["route"] == "ai_explain"
    assert rows[0]._mapping["document_id"] == "doc-xyz"


async def test_persist_usage_event_failure_does_not_raise():
    """DB insert failure must never propagate — only log llm.usage.persist_failed."""
    broken_engine = MagicMock()
    broken_engine.begin.side_effect = RuntimeError("db boom")

    with patch("app.services.llm_usage.asyncio.to_thread", new=AsyncMock(side_effect=RuntimeError("db boom"))):
        # Must return without raising
        await persist_usage_event(
            feature="extraction",
            route="decision_worker",
            provider="anthropic",
            model="claude-haiku-4-5-20251001",
            document_id="doc-fail",
            input_tokens=10,
            output_tokens=5,
            total_tokens=15,
            estimated_cost_usd=None,
            latency_ms=50.0,
        )
    # No assertion needed — test passes if no exception is raised


# ── Dual-route rows ───────────────────────────────────────────────────────────

async def test_same_document_two_routes_two_rows():
    """decision_worker and ai_explain for the same doc must produce separate rows."""
    engine = _sqlite_engine()
    from datetime import datetime, timezone

    for route in ("decision_worker", "ai_explain"):
        _persist_usage_sync(
            {
                "id": f"id-{route}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "feature": "extraction",
                "route": route,
                "provider": "anthropic",
                "model": "claude-haiku-4-5-20251001",
                "document_id": "doc-dual",
                "user_id": None,
                "input_tokens": 100,
                "output_tokens": 50,
                "total_tokens": 150,
                "cache_creation_input_tokens": None,
                "cache_read_input_tokens": None,
                "estimated_cost_usd": 0.00035,
                "latency_ms": 200.0,
                "success": True,
                "error_type": None,
            },
            _engine=engine,
        )

    rows = _query_all(engine)
    assert len(rows) == 2
    routes = {r._mapping["route"] for r in rows}
    assert routes == {"decision_worker", "ai_explain"}
    doc_ids = {r._mapping["document_id"] for r in rows}
    assert doc_ids == {"doc-dual"}


# ── Extraction path — Anthropic provider ────────────────────────────────────

@patch("app.services.llm.parse_explain_json", return_value={"titel": "T"})
@patch("app.services.llm.persist_usage_event", new_callable=AsyncMock)
@patch("app.services.llm.emit_extraction_usage")
async def test_anthropic_explain_persists_with_cache_tokens(
    mock_emit, mock_persist, _mock_parse
):
    from app.services.llm import AnthropicProvider

    provider = AnthropicProvider.__new__(AnthropicProvider)
    provider.model = "claude-haiku-4-5-20251001"

    usage = MagicMock(
        input_tokens=200,
        output_tokens=80,
        cache_creation_input_tokens=500,
        cache_read_input_tokens=300,
    )
    resp = MagicMock(usage=usage, content=[MagicMock(type="text", text='{"titel":"T"}')])
    provider.client = MagicMock()
    provider.client.messages.create = AsyncMock(return_value=resp)

    await provider.explain("sample text", document_id="doc-cache", route="decision_worker")

    # Structured log
    assert mock_emit.call_args.kwargs["cache_creation_input_tokens"] == 500
    assert mock_emit.call_args.kwargs["cache_read_input_tokens"] == 300

    # DB persist
    mock_persist.assert_called_once()
    kw = mock_persist.call_args.kwargs
    assert kw["feature"] == "extraction"
    assert kw["provider"] == "anthropic"
    assert kw["document_id"] == "doc-cache"
    assert kw["cache_creation_input_tokens"] == 500
    assert kw["cache_read_input_tokens"] == 300
    assert kw["estimated_cost_usd"] is not None


@patch("app.services.llm.parse_explain_json", return_value={"titel": "T"})
@patch("app.services.llm.persist_usage_event", new_callable=AsyncMock)
@patch("app.services.llm.emit_extraction_usage")
async def test_unknown_model_cost_null_in_persist(mock_emit, mock_persist, _mock_parse):
    from app.services.llm import AnthropicProvider

    provider = AnthropicProvider.__new__(AnthropicProvider)
    provider.model = "claude-opus-unknown"  # not in pricing table

    usage = MagicMock(input_tokens=50, output_tokens=20, cache_creation_input_tokens=None, cache_read_input_tokens=None)
    resp = MagicMock(usage=usage, content=[MagicMock(type="text", text='{"titel":"T"}')])
    provider.client = MagicMock()
    provider.client.messages.create = AsyncMock(return_value=resp)

    await provider.explain("text", document_id="doc-unknown", route="ai_explain")

    kw = mock_persist.call_args.kwargs
    assert kw["estimated_cost_usd"] is None
    assert kw["input_tokens"] == 50
    assert kw["output_tokens"] == 20


# ── PII guard ─────────────────────────────────────────────────────────────────

async def test_no_raw_text_in_persist_call():
    """persist_usage_event must never receive raw OCR text, prompts, or response bodies."""
    engine = _sqlite_engine()
    raw_text = "Max Mustermann IBAN DE12345678901234567890 Betrag 999 EUR"

    await persist_usage_event(
        feature="extraction",
        route="decision_worker",
        provider="anthropic",
        model="claude-haiku-4-5-20251001",
        document_id="doc-pii",
        input_tokens=300,
        output_tokens=100,
        total_tokens=400,
        estimated_cost_usd=0.00080,
        latency_ms=150.0,
        _engine=engine,
    )
    rows = _query_all(engine)
    assert len(rows) == 1
    serialized = str(dict(rows[0]._mapping))
    assert raw_text not in serialized
    assert "Max Mustermann" not in serialized
    assert "DE12345678901234567890" not in serialized
