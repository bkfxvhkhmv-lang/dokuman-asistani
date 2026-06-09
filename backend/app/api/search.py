from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.schemas.search import SearchRequest, SearchResult
from app.api.auth import get_current_user_id

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/", response_model=list[SearchResult])
async def hybrid_search(
    body: SearchRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Full-text search via PostgreSQL tsvector
    rows = await db.execute(
        text("""
            SELECT d.id,
                   ts_rank(to_tsvector('german', COALESCE(t.roh_text, '')),
                           plainto_tsquery('german', :q)) AS score
            FROM documents d
            LEFT JOIN document_texts t ON t.doc_id = d.id
            WHERE d.user_id = :uid
              AND to_tsvector('german', COALESCE(t.roh_text, '')) @@ plainto_tsquery('german', :q)
            ORDER BY score DESC
            LIMIT :k
        """),
        {"q": body.query, "uid": user_id, "k": body.top_k},
    )
    return [SearchResult(id=r.id, score=float(r.score)) for r in rows.all()]


@router.post("/smart", response_model=list[SearchResult])
async def smart_search(
    body: SearchRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Semantic search via pgvector cosine similarity
    from app.services.llm import get_llm
    llm = get_llm()
    query_vec = await llm.embed(body.query)
    vec_str   = "[" + ",".join(str(v) for v in query_vec) + "]"

    rows = await db.execute(
        text("""
            SELECT d.id,
                   1 - (v.embedding <=> :vec::vector) AS score
            FROM document_vectors v
            JOIN documents d ON d.id = v.doc_id
            WHERE d.user_id = :uid
            ORDER BY v.embedding <=> :vec::vector
            LIMIT :k
        """),
        {"vec": vec_str, "uid": user_id, "k": body.top_k},
    )
    return [SearchResult(id=r.id, score=float(r.score)) for r in rows.all()]
