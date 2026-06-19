"""
OCR worker — downloads image from MinIO, runs PaddleOCR, saves text to DB,
then chains to decision + summary workers.

DB access uses a dedicated sync engine (psycopg2) — Celery workers run in
a separate process where asyncio event loops are not shared with the API.
"""
from app.workers.celery_app import celery_app
from app.services.ocr import run_ocr
from app.models.document import DocumentStatus
import structlog

log = structlog.get_logger()


def execute_ocr_job(doc_id: str, storage_key: str) -> dict:
    """
    Sync path: MinIO → Paddle → DB row + status.
    Celery retry is NOT used here — safe for asyncio.to_thread() from the API.
    """
    log.info("ocr.start", doc_id=doc_id)
    image_bytes = _download(storage_key)
    result = run_ocr(image_bytes)
    _save_text(doc_id, result.text, result.confidence)
    log.info("ocr.done", doc_id=doc_id, conf=result.confidence, chars=len(result.text))

    try:
        from app.workers.decision_worker import process_decision
        from app.workers.summary_worker import process_summary

        process_decision.delay(doc_id, result.text)
        process_summary.delay(doc_id, result.text)
    except Exception as chain_exc:
        log.warning("ocr.chain_enqueue_failed", doc_id=doc_id, error=str(chain_exc))

    return {"doc_id": doc_id, "confidence": result.confidence, "chars": len(result.text)}


@celery_app.task(name="app.workers.ocr_worker.process_ocr", bind=True, max_retries=3)
def process_ocr(self, doc_id: str, storage_key: str) -> dict:
    try:
        return execute_ocr_job(doc_id, storage_key)
    except Exception as exc:
        log.error("ocr.failed", doc_id=doc_id, error=str(exc), retry=self.request.retries)
        if self.request.retries >= self.max_retries:
            _mark_failed(doc_id, str(exc))
        raise self.retry(exc=exc, countdown=30) from exc


# ── Helpers (sync) ────────────────────────────────────────────────────────────

def _download(storage_key: str) -> bytes:
    from app.services.storage import get_minio
    from app.config import get_settings
    settings = get_settings()
    resp = get_minio().get_object(settings.minio_bucket, storage_key)
    data = resp.read()
    resp.close()
    return data


def _sanitize_text_for_db(text: str) -> str:
    return text.replace("\x00", "")


def _save_text(doc_id: str, text: str, confidence: float) -> None:
    from datetime import datetime, timezone
    clean_text = _sanitize_text_for_db(text)
    if clean_text != text:
        log.warning("ocr.nul_removed", doc_id=doc_id, removed=len(text) - len(clean_text))
    engine = _sync_engine()
    with engine.begin() as conn:
        conn.execute(
            _sql("""
                INSERT INTO document_texts (doc_id, roh_text, confidence, lang, updated_at)
                VALUES (:doc_id, :text, :conf, 'de', :ts)
                ON CONFLICT (doc_id) DO UPDATE
                SET roh_text=EXCLUDED.roh_text, confidence=EXCLUDED.confidence, updated_at=EXCLUDED.updated_at
            """),
            {"doc_id": doc_id, "text": clean_text, "conf": confidence, "ts": datetime.now(timezone.utc)},
        )
        conn.execute(
            _sql("UPDATE documents SET status='completed', updated_at=:ts WHERE id=:id"),
            {"ts": datetime.now(timezone.utc), "id": doc_id},
        )


def _mark_failed(doc_id: str, error: str) -> None:
    from datetime import datetime, timezone
    engine = _sync_engine()
    with engine.begin() as conn:
        conn.execute(
            _sql("UPDATE documents SET status=:status, updated_at=:ts WHERE id=:id"),
            {
                "status": DocumentStatus.failed.value,
                "ts": datetime.now(timezone.utc),
                "id": doc_id,
            },
        )
    log.info("ocr.marked_failed", doc_id=doc_id, error=error)


def _sync_engine():
    from sqlalchemy import create_engine
    from app.config import get_settings
    url = get_settings().database_url.replace("+asyncpg", "+psycopg2")
    return create_engine(url, pool_pre_ping=True)


def _sql(q: str):
    from sqlalchemy import text
    return text(q)
