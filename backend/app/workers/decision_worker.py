"""
Decision worker — LLM → typ, risiko, frist, betrag, aktionen → document_meta.
Uses sync DB session (psycopg2) consistent with other workers.
LLM call uses asyncio.run() — isolated per task, no shared event loop.
"""
import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Any

from app.workers.celery_app import celery_app
import structlog

log = structlog.get_logger()

APPLIED_SOURCE_PRODUCTION_LLM = "current_production_llm"


@celery_app.task(name="app.workers.decision_worker.process_decision", bind=True, max_retries=2)
def process_decision(self, doc_id: str, roh_text: str) -> dict:
    log.info("decision.start", doc_id=doc_id)
    try:
        from app.config import get_settings

        shadow_mode = get_settings().extraction_shadow_mode
        parser_result: dict[str, Any] | None = None
        parser_error_type: str | None = None
        parser_latency_ms: float | None = None

        if shadow_mode:
            t0 = time.perf_counter()
            try:
                from app.services.local_document_parser import parse_local_document_dict

                parser_result = parse_local_document_dict(roh_text)
            except Exception as exc:
                parser_error_type = type(exc).__name__
            parser_latency_ms = round((time.perf_counter() - t0) * 1000, 1)

        if shadow_mode:
            t0 = time.perf_counter()
            result = asyncio.run(_llm_explain(roh_text))
            llm_latency_ms: float | None = round((time.perf_counter() - t0) * 1000, 1)
        else:
            llm_latency_ms = None
            result = asyncio.run(_llm_explain(roh_text))

        _save_meta(doc_id, result)

        if shadow_mode:
            try:
                _emit_shadow_compare(
                    doc_id=doc_id,
                    parser_result=parser_result,
                    llm_result=result,
                    parser_latency_ms=parser_latency_ms,
                    llm_latency_ms=llm_latency_ms,
                    parser_error_type=parser_error_type,
                )
            except Exception:
                pass

        log.info("decision.done", doc_id=doc_id, typ=result.get("typ"), risiko=result.get("risiko"))
        return result
    except Exception as exc:
        log.error("decision.failed", doc_id=doc_id, error=str(exc))
        raise self.retry(exc=exc, countdown=60)


async def _llm_explain(roh_text: str) -> dict:
    from app.services.llm import get_llm
    llm    = get_llm()
    result = await llm.explain(roh_text, lang="de")
    return result.model_dump()


def _parser_gate_state(confidence: float | None) -> str:
    if confidence is None:
        return "UNKNOWN"
    if confidence >= 0.80:
        return "HIGH"
    if confidence >= 0.60:
        return "MEDIUM"
    return "LOW"


def _normalize_risk(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip().lower()
    return text or None


def _normalize_amount(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


def _normalize_deadline(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalize_document_type(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _first_action(aktionen: Any) -> str | None:
    if not aktionen:
        return None
    first = aktionen[0]
    if first is None:
        return None
    text = str(first).strip().lower()
    return text or None


def _operational_snapshot(extraction: dict[str, Any]) -> dict[str, Any]:
    return {
        "document_type": extraction.get("typ"),
        "amount": extraction.get("betrag"),
        "deadline": extraction.get("frist"),
        "risk": _normalize_risk(extraction.get("risiko")),
        "sender_present": bool(extraction.get("absender")),
        "next_action": _first_action(extraction.get("aktionen")),
    }


def _scalar_equal(field: str, parser_val: Any, llm_val: Any) -> bool:
    if field == "amount":
        p_amount = _normalize_amount(parser_val)
        l_amount = _normalize_amount(llm_val)
        if p_amount is None and l_amount is None:
            return True
        if p_amount is None or l_amount is None:
            return False
        return abs(p_amount - l_amount) < 0.01
    if field == "deadline":
        return _normalize_deadline(parser_val) == _normalize_deadline(llm_val)
    if field == "document_type":
        return _normalize_document_type(parser_val) == _normalize_document_type(llm_val)
    if field == "risk":
        return _normalize_risk(parser_val) == _normalize_risk(llm_val)
    if field == "next_action":
        return _first_action([parser_val] if parser_val is not None else []) == _first_action(
            [llm_val] if llm_val is not None else []
        )
    return parser_val == llm_val


def _field_diff(
    field: str,
    parser_val: Any,
    llm_val: Any,
    *,
    presence_only: bool = False,
) -> str:
    if presence_only:
        p_present = bool(parser_val)
        l_present = bool(llm_val)
        if not p_present and not l_present:
            return "both_missing"
        if p_present and not l_present:
            return "parser_only"
        if not p_present and l_present:
            return "llm_only"
        return "same"

    p_missing = parser_val is None or parser_val == ""
    l_missing = llm_val is None or llm_val == ""
    if p_missing and l_missing:
        return "both_missing"
    if p_missing and not l_missing:
        return "llm_only"
    if not p_missing and l_missing:
        return "parser_only"
    if _scalar_equal(field, parser_val, llm_val):
        return "same"
    return "different"


def _compute_field_diffs(parser_snap: dict[str, Any], llm_snap: dict[str, Any]) -> dict[str, str]:
    return {
        "document_type": _field_diff(
            "document_type",
            parser_snap.get("document_type"),
            llm_snap.get("document_type"),
        ),
        "amount": _field_diff("amount", parser_snap.get("amount"), llm_snap.get("amount")),
        "deadline": _field_diff("deadline", parser_snap.get("deadline"), llm_snap.get("deadline")),
        "risk": _field_diff("risk", parser_snap.get("risk"), llm_snap.get("risk")),
        "sender": _field_diff(
            "sender",
            parser_snap.get("sender_present"),
            llm_snap.get("sender_present"),
            presence_only=True,
        ),
        "next_action": _field_diff(
            "next_action",
            parser_snap.get("next_action"),
            llm_snap.get("next_action"),
        ),
    }


def _build_shadow_payload(
    *,
    doc_id: str,
    parser_result: dict[str, Any] | None,
    llm_result: dict[str, Any],
    parser_latency_ms: float | None,
    llm_latency_ms: float | None,
    parser_error_type: str | None,
) -> dict[str, Any]:
    parser_confidence = None
    parser_gate_state = "UNKNOWN"
    parser_snapshot: dict[str, Any] | None = None

    if parser_result is not None:
        parser_confidence = parser_result.get("confidence")
        parser_gate_state = _parser_gate_state(
            float(parser_confidence) if parser_confidence is not None else None
        )
        parser_snapshot = _operational_snapshot(parser_result)

    llm_snapshot = _operational_snapshot(llm_result)
    field_diffs = _compute_field_diffs(parser_snapshot or {}, llm_snapshot)

    return {
        "document_id": doc_id,
        "shadow_mode": True,
        "applied_source": APPLIED_SOURCE_PRODUCTION_LLM,
        "parser_confidence": parser_confidence,
        "parser_gate_state": parser_gate_state,
        "parser_latency_ms": parser_latency_ms,
        "llm_latency_ms": llm_latency_ms,
        "parser_snapshot": parser_snapshot,
        "llm_snapshot": llm_snapshot,
        "field_diffs": field_diffs,
        "errors": {
            "parser_error_type": parser_error_type,
            "shadow_log_error_type": None,
        },
    }


def _emit_shadow_compare(
    *,
    doc_id: str,
    parser_result: dict[str, Any] | None,
    llm_result: dict[str, Any],
    parser_latency_ms: float | None,
    llm_latency_ms: float | None,
    parser_error_type: str | None,
) -> None:
    try:
        payload = _build_shadow_payload(
            doc_id=doc_id,
            parser_result=parser_result,
            llm_result=llm_result,
            parser_latency_ms=parser_latency_ms,
            llm_latency_ms=llm_latency_ms,
            parser_error_type=parser_error_type,
        )
        log.info("extraction.shadow_compare", **payload)
    except Exception as exc:
        try:
            log.info(
                "extraction.shadow_compare",
                document_id=doc_id,
                shadow_mode=True,
                applied_source=APPLIED_SOURCE_PRODUCTION_LLM,
                errors={
                    "parser_error_type": parser_error_type,
                    "shadow_log_error_type": type(exc).__name__,
                },
            )
        except Exception:
            pass


def _save_meta(doc_id: str, data: dict) -> None:
    from sqlalchemy import create_engine, text
    from app.config import get_settings

    url    = get_settings().database_url.replace("+asyncpg", "+psycopg2")
    engine = create_engine(url, pool_pre_ping=True)
    ts     = datetime.now(timezone.utc)

    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO document_meta
                    (doc_id, titel, zusammenfassung, kurzfassung, typ, risiko,
                     betrag, frist, iban, warnung, aktionen, updated_at)
                VALUES
                    (:doc_id, :titel, :zus, :kurz, :typ, :risiko,
                     :betrag, :frist, :iban, :warnung, CAST(:aktionen AS jsonb), :ts)
                ON CONFLICT (doc_id) DO UPDATE SET
                    titel=EXCLUDED.titel, zusammenfassung=EXCLUDED.zusammenfassung,
                    kurzfassung=EXCLUDED.kurzfassung, typ=EXCLUDED.typ,
                    risiko=EXCLUDED.risiko, betrag=EXCLUDED.betrag,
                    frist=EXCLUDED.frist, iban=EXCLUDED.iban,
                    warnung=EXCLUDED.warnung, aktionen=EXCLUDED.aktionen,
                    updated_at=EXCLUDED.updated_at
            """),
            {
                "doc_id":  doc_id,
                "titel":   data.get("titel"),
                "zus":     data.get("zusammenfassung"),
                "kurz":    data.get("kurzfassung"),
                "typ":     data.get("typ"),
                "risiko":  data.get("risiko"),
                "betrag":  data.get("betrag"),
                "frist":   data.get("frist"),
                "iban":    data.get("iban"),
                "warnung": data.get("warnung"),
                "aktionen": json.dumps(data.get("aktionen") or []),
                "ts":      ts,
            },
        )
        conn.execute(
            text("UPDATE documents SET status='completed', version=version+1, updated_at=:ts WHERE id=:id"),
            {"ts": ts, "id": doc_id},
        )
