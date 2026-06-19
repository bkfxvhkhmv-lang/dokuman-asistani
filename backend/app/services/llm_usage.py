"""
Scalar LLM usage telemetry for extraction calls.
No prompts, raw OCR, response bodies, sender strings, IBANs, or addresses logged.

DB persistence: one row per AI provider call → ai_usage_events table.
Telemetry failures are logged as llm.usage.persist_failed and never break extraction.

SQL aggregation examples (run against postgres):

  -- Hourly summary (last 24 h)
  SELECT date_trunc('hour', created_at)  AS hour,
         feature, route, provider, model,
         COUNT(*)                         AS calls,
         SUM(total_tokens)                AS total_tokens,
         SUM(estimated_cost_usd)          AS total_cost_usd,
         AVG(latency_ms)                  AS avg_latency_ms
  FROM   ai_usage_events
  WHERE  created_at >= NOW() - INTERVAL '24 hours'
  GROUP  BY 1, 2, 3, 4, 5
  ORDER  BY 1 DESC;

  -- Daily summary
  SELECT created_at::date                AS day,
         feature, route, provider, model,
         COUNT(*)                         AS calls,
         SUM(total_tokens)                AS total_tokens,
         SUM(estimated_cost_usd)          AS total_cost_usd,
         SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS failures
  FROM   ai_usage_events
  GROUP  BY 1, 2, 3, 4, 5
  ORDER  BY 1 DESC;

  -- Weekly summary
  SELECT date_trunc('week', created_at)  AS week,
         feature,
         SUM(estimated_cost_usd)          AS total_cost_usd,
         SUM(total_tokens)                AS total_tokens,
         COUNT(*)                         AS calls
  FROM   ai_usage_events
  GROUP  BY 1, 2
  ORDER  BY 1 DESC;
"""
from __future__ import annotations

import asyncio
import uuid as _uuid_mod
from datetime import datetime, timezone
from typing import Any

import structlog

log = structlog.get_logger()

# USD per 1M tokens: (input, output). Exact model-id match only — no guessing.
MODEL_PRICING_PER_M: dict[str, tuple[float, float]] = {
    "gpt-4o-mini": (0.15, 0.60),
    "claude-haiku-4-5-20251001": (1.00, 5.00),
}

_INSERT_SQL = """
    INSERT INTO ai_usage_events (
        id, created_at, feature, route, provider, model,
        document_id, user_id,
        input_tokens, output_tokens, total_tokens,
        cache_creation_input_tokens, cache_read_input_tokens,
        estimated_cost_usd, latency_ms, success, error_type
    ) VALUES (
        :id, :created_at, :feature, :route, :provider, :model,
        :document_id, :user_id,
        :input_tokens, :output_tokens, :total_tokens,
        :cache_creation_input_tokens, :cache_read_input_tokens,
        :estimated_cost_usd, :latency_ms, :success, :error_type
    )
"""


def estimate_cost_usd(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_creation_input_tokens: int = 0,
    cache_read_input_tokens: int = 0,
) -> float | None:
    """Return estimated USD cost for the call, or None if model pricing is unknown.

    Cache token rates (Anthropic):
      cache_creation = 1.25 × input_rate
      cache_read     = 0.10 × input_rate
    """
    rates = MODEL_PRICING_PER_M.get(model)
    if rates is None:
        return None
    in_rate, out_rate = rates
    cost = (
        input_tokens * in_rate
        + output_tokens * out_rate
        + cache_creation_input_tokens * in_rate * 1.25
        + cache_read_input_tokens * in_rate * 0.10
    ) / 1_000_000
    return round(cost, 8)


def log_llm_usage(
    *,
    feature: str,
    document_id: str,
    provider: str,
    model: str,
    route: str,
    input_tokens: int | None,
    output_tokens: int | None,
    total_tokens: int | None,
    cache_creation_input_tokens: int | None,
    cache_read_input_tokens: int | None,
    estimated_cost_usd: float | None,
    latency_ms: float,
    success: bool,
    error_type: str | None,
) -> None:
    log.info(
        "llm.usage",
        feature=feature,
        document_id=document_id,
        provider=provider,
        model=model,
        route=route,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        cache_creation_input_tokens=cache_creation_input_tokens,
        cache_read_input_tokens=cache_read_input_tokens,
        estimated_cost_usd=estimated_cost_usd,
        latency_ms=round(latency_ms, 1),
        success=success,
        error_type=error_type,
    )


def emit_extraction_usage(
    *,
    document_id: str | None,
    route: str | None,
    provider: str,
    model: str,
    input_tokens: int | None,
    output_tokens: int | None,
    total_tokens: int | None,
    latency_ms: float,
    feature: str = "extraction",
    cache_creation_input_tokens: int | None = None,
    cache_read_input_tokens: int | None = None,
    success: bool = True,
    error_type: str | None = None,
) -> None:
    """Emit a structured llm.usage log event (synchronous, no DB write)."""
    if not document_id or not route:
        return
    cost: float | None = None
    if input_tokens is not None and output_tokens is not None:
        cost = estimate_cost_usd(
            model,
            input_tokens,
            output_tokens,
            cache_creation_input_tokens or 0,
            cache_read_input_tokens or 0,
        )
    log_llm_usage(
        feature=feature,
        document_id=document_id,
        provider=provider,
        model=model,
        route=route,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        cache_creation_input_tokens=cache_creation_input_tokens,
        cache_read_input_tokens=cache_read_input_tokens,
        estimated_cost_usd=cost,
        latency_ms=latency_ms,
        success=success,
        error_type=error_type,
    )


def _persist_usage_sync(fields: dict[str, Any], *, _engine: Any = None) -> None:
    """Insert one ai_usage_events row via a sync psycopg2 connection.

    `_engine` is only injected in tests (e.g. SQLite in-memory engine).
    """
    if _engine is None:
        from sqlalchemy import create_engine
        from app.config import get_settings
        url = get_settings().database_url.replace("+asyncpg", "+psycopg2")
        _engine = create_engine(url, pool_pre_ping=True)
        dispose_after = True
    else:
        dispose_after = False

    from sqlalchemy import text
    with _engine.begin() as conn:
        conn.execute(text(_INSERT_SQL), fields)

    if dispose_after:
        _engine.dispose()


async def persist_usage_event(
    *,
    feature: str,
    route: str,
    provider: str,
    model: str | None,
    document_id: str | None,
    user_id: str | None = None,
    input_tokens: int | None,
    output_tokens: int | None,
    total_tokens: int | None,
    cache_creation_input_tokens: int | None = None,
    cache_read_input_tokens: int | None = None,
    estimated_cost_usd: float | None,
    latency_ms: float,
    success: bool = True,
    error_type: str | None = None,
    _engine: Any = None,
) -> None:
    """Persist one AI provider call to ai_usage_events. Never raises — failures are logged."""
    fields = {
        "id":                          str(_uuid_mod.uuid4()),
        "created_at":                  datetime.now(timezone.utc),
        "feature":                     feature,
        "route":                       route,
        "provider":                    provider,
        "model":                       model,
        "document_id":                 document_id,
        "user_id":                     user_id,
        "input_tokens":                input_tokens,
        "output_tokens":               output_tokens,
        "total_tokens":                total_tokens,
        "cache_creation_input_tokens": cache_creation_input_tokens,
        "cache_read_input_tokens":     cache_read_input_tokens,
        "estimated_cost_usd":          estimated_cost_usd,
        "latency_ms":                  round(latency_ms, 2) if latency_ms is not None else None,
        "success":                     success,
        "error_type":                  error_type,
    }
    try:
        await asyncio.to_thread(_persist_usage_sync, fields, _engine=_engine)
    except Exception as exc:
        log.warning("llm.usage.persist_failed", error_type=type(exc).__name__)
