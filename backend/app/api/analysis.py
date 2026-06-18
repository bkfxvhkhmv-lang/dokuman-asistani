from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.document import Document, DocumentText
from app.schemas.analysis import ExplainResult, ChatRequest, ChatResponse
from app.services.llm import get_llm
from app.api.auth import get_current_user_id

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/explain/{doc_id}", response_model=ExplainResult)
async def explain_document(
    doc_id: str,
    body: dict = {},
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    lang = body.get("lang", "de") if isinstance(body, dict) else "de"

    doc = await _get_doc_or_404(db, doc_id, user_id)

    # If already analyzed, return cached meta
    if doc.meta and doc.meta.zusammenfassung:
        return ExplainResult(
            text=doc.text.roh_text[:500] if doc.text else None,
            zusammenfassung=doc.meta.zusammenfassung,
            kurzfassung=doc.meta.kurzfassung,
            titel=doc.meta.titel,
            typ=doc.meta.typ,
            risiko=doc.meta.risiko.value if doc.meta.risiko else None,
            betrag=doc.meta.betrag,
            frist=doc.meta.frist,
            iban=doc.meta.iban,
            aktionen=doc.meta.aktionen,
            warnung=doc.meta.warnung,
            confidence=doc.text.confidence if doc.text else None,
        )

    # No cached result — run LLM now (synchronous path, for small documents)
    if not doc.text:
        raise HTTPException(
            status_code=422,
            detail="No OCR/text row yet (worker pending, failed before save, or not started). "
            "Ensure the upload is a valid image readable by Pillow/Paddle.",
        )

    raw = doc.text.roh_text
    if raw is None or not str(raw).strip():
        raise HTTPException(
            status_code=422,
            detail="OCR completed but yielded no usable text (empty OCR). Explain needs readable content — "
            "try a sharper scan.",
        )

    llm = get_llm()
    result = await llm.explain(
        raw,
        lang=lang,
        document_id=doc_id,
        route="ai_explain",
    )
    return result


@router.post("/chat/{doc_id}", response_model=ChatResponse)
async def chat_with_document(
    doc_id: str,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    doc = await _get_doc_or_404(db, doc_id, user_id)
    context = doc.text.roh_text if doc.text else ""

    if not context:
        raise HTTPException(422, "Document has no text content for chat.")

    llm = get_llm()
    reply = await llm.chat(body.messages, context=context, lang=body.lang)

    return ChatResponse(reply=reply, doc_id=doc_id, model_used=llm.__class__.__name__)


@router.get("/languages")
async def get_languages():
    return {"languages": ["de", "en", "tr", "fr", "it", "es", "pl", "ar"]}


# ── Helper ────────────────────────────────────────────────────────────────────

async def _get_doc_or_404(db: AsyncSession, doc_id: str, user_id: str) -> Document:
    from sqlalchemy.orm import selectinload
    row = await db.execute(
        select(Document)
        .options(selectinload(Document.text), selectinload(Document.meta))
        .where(Document.id == doc_id, Document.user_id == user_id)
    )
    doc = row.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc
