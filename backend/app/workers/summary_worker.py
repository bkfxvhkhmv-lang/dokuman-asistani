"""
Summary worker — generates vector embedding → document_vectors (pgvector).
Enables semantic search via cosine similarity.
"""
import asyncio
from datetime import datetime, timezone

from app.workers.celery_app import celery_app
import structlog

log = structlog.get_logger()


@celery_app.task(name="app.workers.summary_worker.process_summary", bind=True, max_retries=2)
def process_summary(self, doc_id: str, roh_text: str) -> dict:
    log.info("summary.embed_start", doc_id=doc_id)
    try:
        embedding = asyncio.run(_get_embedding(roh_text))
        _save_embedding(doc_id, embedding)
        log.info("summary.embed_done", doc_id=doc_id, dims=len(embedding))
        return {"doc_id": doc_id, "dims": len(embedding)}
    except Exception as exc:
        log.error("summary.failed", doc_id=doc_id, error=str(exc))
        raise self.retry(exc=exc, countdown=60)


async def _get_embedding(text: str) -> list[float]:
    from app.services.llm import get_llm
    return await get_llm().embed(text[:8000])


def _save_embedding(doc_id: str, embedding: list[float]) -> None:
    from sqlalchemy import create_engine, text
    from app.config import get_settings

    url    = get_settings().database_url.replace("+asyncpg", "+psycopg2")
    engine = create_engine(url, pool_pre_ping=True)
    vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO document_vectors (doc_id, embedding, updated_at)
                VALUES (:doc_id, CAST(:emb AS vector), :ts)
                ON CONFLICT (doc_id) DO UPDATE
                SET embedding=EXCLUDED.embedding, updated_at=EXCLUDED.updated_at
            """),
            {"doc_id": doc_id, "emb": vec_str, "ts": datetime.now(timezone.utc)},
        )
