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

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.document import Document, DocumentText, DocumentMeta, DocumentStatus, JobStatus
from app.schemas.document import DocumentOut, DocumentListOut, DeltaSyncResult, SyncDocumentOut
from app.schemas.worker_result import (
    BackendWorkerResult,
    WorkerResultActionSummary,
    WorkerResultDocument,
    WorkerResultMeta,
)
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


@router.post("/", response_model=DocumentOut)
async def upload_document(
    response: Response,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    data = await file.read()
    checksum = hashlib.sha256(data).hexdigest()

    existing = await _find_duplicate_document(db, user_id, checksum)
    if existing:
        log.info(
            "upload.duplicate_checksum",
            user_id=user_id,
            checksum=checksum[:12],
            existing_id=existing.id,
        )
        response.status_code = 200
        return _upload_out(existing, duplicate=True)

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

    response.status_code = 201
    return _upload_out(doc, duplicate=False)


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


@router.get("/{doc_id}/result", response_model=BackendWorkerResult)
async def get_document_worker_result(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    doc = await _get_with_relations_or_404(db, doc_id, user_id)
    return _worker_result_out(doc)


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

async def _find_duplicate_document(
    db: AsyncSession,
    user_id: str,
    checksum: str,
) -> Optional[Document]:
    row = await db.execute(
        select(Document)
        .where(Document.user_id == user_id, Document.checksum == checksum)
        .order_by(Document.created_at.asc())
        .limit(1)
    )
    return row.scalar_one_or_none()


def _upload_out(doc: Document, *, duplicate: bool) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        status=doc.status.value,
        checksum=doc.checksum,
        version=doc.version,
        updated_at=doc.updated_at.isoformat() if doc.updated_at else None,
        duplicate=duplicate,
        existing_document_id=doc.id if duplicate else None,
    )


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


async def _get_with_relations_or_404(db: AsyncSession, doc_id: str, user_id: str) -> Document:
    row = await db.execute(
        select(Document)
        .options(
            selectinload(Document.meta),
            selectinload(Document.text),
            selectinload(Document.jobs),
        )
        .where(Document.id == doc_id, Document.user_id == user_id)
    )
    doc = row.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


def _worker_result_out(doc: Document) -> BackendWorkerResult:
    text = doc.text
    meta = doc.meta
    status = doc.status.value

    raw_text = (text.roh_text or None) if text else None
    if raw_text is not None and not str(raw_text).strip():
        raw_text = None

    confidence = text.confidence if text else None
    language = text.lang if text else None

    deadline = meta.frist if meta else None
    amount = meta.betrag if meta else None
    aktionen = list(meta.aktionen or []) if meta else []
    warnung = (meta.warnung or "").strip() if meta else ""

    processed_at = (
        meta.updated_at if meta and meta.updated_at else doc.updated_at
    )
    processed_at_iso = (
        processed_at.isoformat() if processed_at else datetime.now(timezone.utc).isoformat()
    )

    return BackendWorkerResult(
        job_id=doc.id,
        status=status,
        confidence=confidence,
        language=language,
        document=WorkerResultDocument(
            suggested_title=meta.titel if meta else None,
            document_type=meta.typ if meta else None,
            sender=None,
            date=None,
            deadline=deadline,
            amount=amount,
            currency="EUR" if amount is not None else None,
            raw_text=raw_text,
        ),
        action_summary=WorkerResultActionSummary(
            kind=None,
            summary=meta.zusammenfassung if meta else None,
            short_summary=meta.kurzfassung if meta else None,
            next_action=aktionen[0] if aktionen else None,
            deadline=deadline,
            amount=amount,
            warnings=[warnung] if warnung else [],
            recommended_actions=aktionen,
        ),
        meta=WorkerResultMeta(
            model=None,
            processed_at=processed_at_iso,
            iban=meta.iban if meta else None,
        ),
        error=_failed_job_error(doc) if status == "failed" else None,
    )


def _failed_job_error(doc: Document) -> Optional[str]:
    failed = [
        j for j in (doc.jobs or [])
        if j.status == JobStatus.failed and (j.error or "").strip()
    ]
    if not failed:
        return None
    failed.sort(key=lambda j: j.updated_at or j.created_at)
    return (failed[-1].error or "").strip() or None


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
