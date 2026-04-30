"""GET /sync/delta must mirror GET /documents/sync/delta (frontend v4-api)."""

from httpx import AsyncClient, ASGITransport

from app.main import app


async def test_delta_sync_routes_both_registered():
    paths = {getattr(r, "path", "") for r in app.routes}
    assert "/sync/delta" in paths
    assert "/documents/sync/delta" in paths
    assert "/api/v4/sync/delta" in paths


async def test_delta_sync_bad_since_same_on_both_paths():
    """Invalid `since` → 400 from both URLs (dev auth bypass)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r1 = await c.get("/sync/delta?since=not-an-iso-date")
        r2 = await c.get("/documents/sync/delta?since=not-an-iso-date")
    assert r1.status_code == r2.status_code == 400


async def test_delta_sync_production_no_auth_same():
    """Missing Bearer → same 401 from both aliases."""
    from unittest.mock import MagicMock, patch

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

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        with patch("app.api.auth.get_settings", return_value=fake):
            r1 = await c.get("/sync/delta?since=2025-01-01T00:00:00Z")
            r2 = await c.get("/documents/sync/delta?since=2025-01-01T00:00:00Z")
    assert r1.status_code == r2.status_code == 401
