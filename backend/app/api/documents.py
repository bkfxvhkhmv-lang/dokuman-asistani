import asyncio
import hashlib
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import structlog

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.document import Document, DocumentText, DocumentMeta, DocumentStatus
from app.schemas.document import DocumentOut, DocumentListOut, DeltaSyncResult, SyncDocumentOut
from app.services.storage import upload_file, delete_file
from app.api.auth import get_current_user_id
from app.config import get_settings

log = structlog.get_logger()

# backend/ — contains `app/` package (documents lives in app/api/).
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _inline_ocr_in_subprocess(doc_id: str, storage_key: str) -> None:
    """
    Paddle/PaddleOCR native code can SIGSEGV/OOM; isolate in a child interpreter so uvicorn keeps serving.
    """
    cfg = get_settings()
    snippet = (
        "from app.workers.ocr_worker import execute_ocr_job; "
        f"execute_ocr_job({doc_id!r}, {storage_key!r})"
    )
    proc = subprocess.run(
        [sys.executable, "-c", snippet],
        cwd=str(_BACKEND_ROOT),
        timeout=float(cfg.ocr_subprocess_timeout_sec),
        capture_output=True,
        text=True,
        env=os.environ.copy(),
    )
    if proc.returncode != 0:
        err = (proc.stderr or "").strip()
        out = (proc.stdout or "").strip()
        tail_e = "\n".join(err.splitlines()[-30:]) if err else ""
        tail_o = "\n".join(out.splitlines()[-10:]) if out else ""
        msg = f"exit code {proc.returncode}"
        if tail_e:
            msg += f"\nstderr (tail):\n{tail_e}"
        if tail_o:
            msg += f"\nstdout (tail):\n{tail_o}"
        raise RuntimeError(msg)


router = APIRouter(prefix="/documents", tags=["documents"])
# Client contract (action-first UI): GET /documents/{id} soll u. a. liefern:
#   status: pending|processing|action_needed|done
#   amount, due_date, summary (optional)
#   next_action: { "type": "pay"|..., "label": "…" }  — verbindlich sobald ausgerollt
sync_alias_router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    data = await file.read()
    checksum = hashlib.sha256(data).hexdigest()

    doc_id     = str(uuid.uuid4())
    storage_key = f"{user_id}/{doc_id}/{file.filename}"

    await upload_file(data, storage_key, file.content_type or "application/octet-stream")

    doc = Document(
        id=doc_id,
        user_id=user_id,
        filename=file.filename or "document",
        mime_type=file.content_type or "application/octet-stream",
        storage_key=storage_key,
        checksum=checksum,
        status=DocumentStatus.pending,
    )
    db.add(doc)
    await db.flush()
    # OCR uses a separate DB connection; FK to documents.id requires this row to be committed first.
    await db.commit()

    cfg = get_settings()
    if not cfg.ocr_enabled:
        log.info("upload.ocr_disabled_skip", doc_id=doc_id)
    else:
        from app.workers.ocr_worker import process_ocr

        inline_ocr = cfg.process_ocr_inline_dev and (cfg.environment or "").strip().lower() == "development"

        if inline_ocr:
            try:
                await asyncio.to_thread(_inline_ocr_in_subprocess, doc_id, storage_key)
            except subprocess.TimeoutExpired as exc:
                log.warning("upload.inline_ocr_timeout", doc_id=doc_id, timeout=exc.timeout)
                raise HTTPException(
                    status_code=503,
                    detail=f"Inline OCR subprocess exceeded {exc.timeout:g}s (OCR_SUBPROCESS_TIMEOUT_SEC).",
                ) from exc
            except Exception as exc:
                log.exception("upload.inline_ocr_failed", doc_id=doc_id)
                dev = (cfg.environment or "").strip().lower() == "development"
                msg = str(exc).strip() or exc.__class__.__name__
                if len(msg) > 800:
                    msg = msg[:800] + "…"
                raise HTTPException(
                    status_code=503,
                    detail=(
                        f"Inline OCR failed: {msg}"
                        if dev
                        else "Document stored but OCR processing failed."
                    ),
                ) from exc
            row = await db.execute(select(Document).where(Document.id == doc_id))
            doc = row.scalar_one()
        else:
            process_ocr.delay(doc_id, storage_key)

    # Return immediately without touching lazy-loaded relations (meta/text not yet set)
    return DocumentOut(
        id=doc.id,
        status=doc.status.value,
        checksum=doc.checksum,
        version=doc.version,
        updated_at=doc.updated_at.isoformat() if doc.updated_at else None,
    )


@router.get("/", response_model=DocumentListOut)
async def list_documents(
    limit: int  = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    total_q = await db.execute(select(func.count()).where(Document.user_id == user_id))
    total   = total_q.scalar_one()

    rows = await db.execute(
        select(Document)
        .options(selectinload(Document.meta))
        .where(Document.user_id == user_id)
        .order_by(Document.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    docs = rows.scalars().all()

    return DocumentListOut(
        items=[_doc_out(d) for d in docs],
        total=total,
        limit=limit,
        offset=offset,
        has_more=(offset + limit) < total,
    )


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    doc = await _get_or_404(db, doc_id, user_id)
    return _doc_out(doc)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    doc = await _get_or_404(db, doc_id, user_id)
    await delete_file(doc.storage_key)
    await db.delete(doc)


# ── Sync ──────────────────────────────────────────────────────────────────────


async def _delta_sync_core(since: str, db: AsyncSession, user_id: str) -> DeltaSyncResult:
    try:
        since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, "Invalid 'since' timestamp. Use ISO 8601.")

    rows = await db.execute(
        select(Document)
        .where(Document.user_id == user_id, Document.updated_at > since_dt)
        .order_by(Document.updated_at)
    )
    changed = [
        SyncDocumentOut(
            id=d.id,
            user_id=d.user_id,
            status=d.status.value,
            checksum=d.checksum,
            version=d.version,
            updated_at=d.updated_at.isoformat() if d.updated_at else None,
        )
        for d in rows.scalars().all()
    ]

    return DeltaSyncResult(changed=changed, deleted=[])


@router.get("/sync/delta", response_model=DeltaSyncResult, tags=["sync"])
@sync_alias_router.get("/delta", response_model=DeltaSyncResult)
async def delta_sync(
    since: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return await _delta_sync_core(since, db, user_id)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_or_404(db: AsyncSession, doc_id: str, user_id: str) -> Document:
    row = await db.execute(
        select(Document)
        .options(selectinload(Document.meta))
        .where(Document.id == doc_id, Document.user_id == user_id)
    )
    doc = row.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


def _doc_out(doc: Document) -> DocumentOut:
    meta = doc.meta
    return DocumentOut(
        id=doc.id,
        titel=meta.titel if meta else None,
        status=doc.status.value,
        typ=meta.typ if meta else None,
        risiko=meta.risiko.value if (meta and meta.risiko) else None,
        betrag=meta.betrag if meta else None,
        frist=meta.frist if meta else None,
        checksum=doc.checksum,
        version=doc.version,
        updated_at=doc.updated_at.isoformat() if doc.updated_at else None,
    )
