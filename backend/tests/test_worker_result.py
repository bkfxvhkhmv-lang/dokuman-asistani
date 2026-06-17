"""Unit + API tests for GET /documents/{doc_id}/result (#129C-backend)."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.documents import _worker_result_out
from app.database import get_db
from app.main import app
from app.models.document import DocumentStatus, JobStatus


def _dt() -> datetime:
    return datetime(2026, 6, 16, 12, 0, 0, tzinfo=timezone.utc)


def _make_text(*, roh_text: str = "", confidence: float | None = None, lang: str = "de"):
    text = MagicMock()
    text.roh_text = roh_text
    text.confidence = confidence
    text.lang = lang
    return text


def _make_meta(**fields):
    meta = MagicMock()
    meta.titel = fields.get("titel")
    meta.typ = fields.get("typ")
    meta.frist = fields.get("frist")
    meta.betrag = fields.get("betrag")
    meta.zusammenfassung = fields.get("zusammenfassung")
    meta.kurzfassung = fields.get("kurzfassung")
    meta.iban = fields.get("iban")
    meta.warnung = fields.get("warnung")
    meta.aktionen = fields.get("aktionen")
    meta.updated_at = fields.get("updated_at", _dt())
    return meta


def _make_doc(**fields):
    doc = MagicMock()
    doc.id = fields.get("id", "doc-pending-1")
    doc.status = MagicMock(value=fields.get("status", DocumentStatus.pending.value))
    doc.updated_at = fields.get("updated_at", _dt())
    doc.text = fields.get("text")
    doc.meta = fields.get("meta")
    doc.jobs = fields.get("jobs", [])
    return doc


def test_worker_result_pending_shape():
    doc = _make_doc(status=DocumentStatus.pending.value)
    result = _worker_result_out(doc)

    assert result.job_id == "doc-pending-1"
    assert result.status == "pending"
    assert result.confidence is None
    assert result.language is None
    assert result.document.raw_text is None
    assert result.document.suggested_title is None
    assert result.action_summary.summary is None
    assert result.action_summary.warnings == []
    assert result.action_summary.recommended_actions == []
    assert result.meta.source == "paddle_worker"
    assert result.meta.provider == "paddle"
    assert result.meta.model is None
    assert result.error is None


def test_worker_result_completed_maps_text_and_meta():
    doc = _make_doc(
        id="doc-done-1",
        status=DocumentStatus.completed.value,
        text=_make_text(roh_text="Kostenbescheid Finanzamt", confidence=0.91, lang="de"),
        meta=_make_meta(
            titel="Kostenbescheid",
            typ="Behörden / Amt",
            frist="2026-07-01",
            betrag=128.5,
            zusammenfassung="Zahlung erforderlich",
            kurzfassung="128,50 € bis 01.07.",
            iban="DE89370400440532013000",
            warnung="Frist beachten",
            aktionen=["zahlen", "kalender"],
        ),
    )
    result = _worker_result_out(doc)

    assert result.status == "completed"
    assert result.confidence == 0.91
    assert result.language == "de"
    assert result.document.suggested_title == "Kostenbescheid"
    assert result.document.document_type == "Behörden / Amt"
    assert result.document.sender is None
    assert result.document.date is None
    assert result.document.deadline == "2026-07-01"
    assert result.document.amount == 128.5
    assert result.document.currency == "EUR"
    assert result.document.raw_text == "Kostenbescheid Finanzamt"
    assert result.action_summary.kind is None
    assert result.action_summary.summary == "Zahlung erforderlich"
    assert result.action_summary.short_summary == "128,50 € bis 01.07."
    assert result.action_summary.next_action == "zahlen"
    assert result.action_summary.deadline == "2026-07-01"
    assert result.action_summary.amount == 128.5
    assert result.action_summary.warnings == ["Frist beachten"]
    assert result.action_summary.recommended_actions == ["zahlen", "kalender"]
    assert result.meta.iban == "DE89370400440532013000"
    assert result.meta.processed_at == _dt().isoformat()


def test_worker_result_completed_ocr_only_no_meta():
    """OCR done, AI worker not yet run (meta=None). /result must return 200 with OCR fields."""
    doc = _make_doc(
        id="doc-ocr-only",
        status=DocumentStatus.completed.value,
        text=_make_text(roh_text="Schornsteinfeger Rechnung", confidence=0.95, lang="de"),
        meta=None,
    )
    result = _worker_result_out(doc)

    assert result.status == "completed"
    assert result.confidence == 0.95
    assert result.language == "de"
    assert result.document.raw_text == "Schornsteinfeger Rechnung"
    assert result.document.suggested_title is None
    assert result.document.document_type is None
    assert result.document.sender is None
    assert result.document.deadline is None
    assert result.document.amount is None
    assert result.document.currency is None
    assert result.action_summary.summary is None
    assert result.action_summary.short_summary is None
    assert result.action_summary.next_action is None
    assert result.action_summary.warnings == []
    assert result.action_summary.recommended_actions == []
    assert result.meta.source == "paddle_worker"
    assert result.meta.provider == "paddle"
    assert result.meta.iban is None
    assert result.error is None


def test_worker_result_failed_includes_job_error():
    failed_job = MagicMock()
    failed_job.status = JobStatus.failed
    failed_job.error = "Paddle OCR subprocess crashed"
    failed_job.updated_at = _dt()
    failed_job.created_at = _dt()

    doc = _make_doc(status=DocumentStatus.failed.value, jobs=[failed_job])
    result = _worker_result_out(doc)

    assert result.status == "failed"
    assert result.error == "Paddle OCR subprocess crashed"


async def test_worker_result_endpoint_not_found():
    async def fake_get_db():
        session = AsyncMock()
        row = MagicMock()
        row.scalar_one_or_none.return_value = None
        session.execute.return_value = row
        yield session

    app.dependency_overrides[get_db] = fake_get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/documents/missing-doc/result")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)


async def test_worker_result_endpoint_pending_via_api():
    pending_doc = _make_doc(status=DocumentStatus.pending.value)

    async def fake_get_db():
        session = AsyncMock()
        row = MagicMock()
        row.scalar_one_or_none.return_value = pending_doc
        session.execute.return_value = row
        yield session

    app.dependency_overrides[get_db] = fake_get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/documents/doc-pending-1/result")
        assert response.status_code == 200
        body = response.json()
        assert body["job_id"] == "doc-pending-1"
        assert body["status"] == "pending"
        assert body["document"]["raw_text"] is None
        assert body["action_summary"]["recommended_actions"] == []
        assert body["meta"]["source"] == "paddle_worker"
    finally:
        app.dependency_overrides.pop(get_db, None)
