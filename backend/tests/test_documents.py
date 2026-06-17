"""
Smoke tests — health + upload (MinIO mocked).

Run inside container:
  pytest tests/ -v

MinIO and DB are mocked so these tests run without external services.
"""
import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_db


@pytest.fixture
def jpeg_bytes() -> bytes:
    # Minimal valid JPEG (1×1 white pixel)
    return bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD2,
        0x8A, 0x28, 0x03, 0xFF, 0xD9,
    ])


async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/health/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


async def test_upload_dev_mode(jpeg_bytes):
    """Upload in dev mode — MinIO mocked, OCR mocked, DB via dependency override."""

    mock_doc_attrs = MagicMock()
    mock_doc_attrs.status = MagicMock(value="pending")
    mock_doc_attrs.version = 1
    mock_doc_attrs.updated_at = None

    class _FakeSession:
        def __init__(self):
            self._doc = None

        async def flush(self):
            pass

        async def commit(self):
            pass

        def add(self, doc):
            self._doc = doc

        async def execute(self, _stmt):
            row = MagicMock()
            row.scalar_one.return_value = self._doc or mock_doc_attrs
            return row

    async def fake_get_db():
        yield _FakeSession()

    app.dependency_overrides[get_db] = fake_get_db

    with (
        patch("app.api.documents.upload_file", new=AsyncMock(return_value="key")),
        patch("app.api.documents._inline_ocr_in_subprocess", new=MagicMock(return_value=None)),
        patch("app.workers.ocr_worker.process_ocr.delay", new=MagicMock(return_value=None)),
        patch("app.workers.ocr_worker.process_ocr.apply", new=MagicMock(return_value=None)),
    ):
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                r = await c.post(
                    "/documents/",
                    files={"file": ("test.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")},
                )
            assert r.status_code == 201
        finally:
            app.dependency_overrides.pop(get_db, None)


async def test_upload_no_auth_non_dev():
    """Without dev mode, missing auth → 401."""
    fake = MagicMock()
    fake.environment = "production"
    fake.secret_key = "x"
    fake.algorithm = "HS256"
    fake.supabase_jwt_secret = ""
    fake.supabase_url = ""
    fake.supabase_jwks_url = ""
    fake.supabase_verify_issuer = False
    fake.supabase_jwt_issuer = ""
    fake.supabase_verify_audience = True
    fake.supabase_jwt_audience = "authenticated"

    with patch("app.api.auth.get_settings", return_value=fake):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r = await c.post("/documents/", files={"file": ("f.jpg", b"x", "image/jpeg")})
    assert r.status_code == 401


@pytest.mark.skip(reason="integration test — needs isolated async DB session, not unit-test safe")
async def test_list_documents_dev_mode():
    pytest.skip("integration test — needs isolated async DB session")
