"""
Decision worker — LLM → typ, risiko, frist, betrag, aktionen → document_meta.
Uses sync DB session (psycopg2) consistent with other workers.
LLM call uses asyncio.run() — isolated per task, no shared event loop.
"""
import asyncio
import json
from datetime import datetime, timezone

from app.workers.celery_app import celery_app
import structlog

log = structlog.get_logger()


@celery_app.task(name="app.workers.decision_worker.process_decision", bind=True, max_retries=2)
def process_decision(self, doc_id: str, roh_text: str) -> dict:
    log.info("decision.start", doc_id=doc_id)
    try:
        result = asyncio.run(_llm_explain(roh_text))
        _save_meta(doc_id, result)
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
                     :betrag, :frist, :iban, :warnung, :aktionen::jsonb, :ts)
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
