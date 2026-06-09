"""JWT decode helpers (Supabase + app HS256 fallback)."""

from unittest.mock import MagicMock, patch

from jose import jwt
import pytest


@pytest.fixture
def mock_settings_factory():
    def _make(**overrides):
        fake = MagicMock()
        fake.supabase_url = ""
        fake.supabase_jwks_url = ""
        fake.supabase_jwt_issuer = ""
        fake.supabase_verify_issuer = False
        fake.supabase_jwt_secret = ""
        fake.supabase_verify_audience = True
        fake.supabase_jwt_audience = "authenticated"
        fake.secret_key = "briefpilot-apps-secret-xx"
        fake.algorithm = "HS256"
        for k, v in overrides.items():
            setattr(fake, k, v)
        return fake

    return _make


def test_sub_from_supabase_token(mock_settings_factory):
    from app.api.auth import _sub_from_token

    supabase_secret = "x" * 32
    fake = mock_settings_factory(supabase_jwt_secret=supabase_secret)
    tok = jwt.encode(
        {"sub": "00000000-0000-0000-0000-000000000001", "aud": "authenticated"},
        supabase_secret,
        algorithm="HS256",
    )
    with patch("app.api.auth.get_settings", return_value=fake):
        assert _sub_from_token(tok) == "00000000-0000-0000-0000-000000000001"


def test_sub_fallback_app_secret(mock_settings_factory):
    """If Supabase secret is unset, BriefPilot-signed HS256 tokens work."""
    from app.api.auth import _sub_from_token

    fake = mock_settings_factory()
    fake.supabase_jwt_secret = ""
    tok = jwt.encode({"sub": "local-dev-user"}, fake.secret_key, algorithm="HS256")
    with patch("app.api.auth.get_settings", return_value=fake):
        assert _sub_from_token(tok) == "local-dev-user"


def test_sub_supabase_first_then_app(mock_settings_factory):
    """When both secrets exist, HS256 verified with Supabase key first."""
    from app.api.auth import _sub_from_token

    fake = mock_settings_factory(supabase_jwt_secret="proj-" + "y" * 28)
    tok_bp = jwt.encode({"sub": "only-on-app-secret"}, fake.secret_key, algorithm="HS256")
    with patch("app.api.auth.get_settings", return_value=fake):
        assert _sub_from_token(tok_bp) == "only-on-app-secret"
