"""
JWT auth:
  1) Supabase **Current** keys: JWKS (`ES256` / `RS256`) via project URL
  2) Supabase **Legacy** `HS256` + `SUPABASE_JWT_SECRET`
  3) BriefPilot `HS256` + `SECRET_KEY`
"""
from __future__ import annotations

import functools

import jwt
from jwt import PyJWKClient
from jwt.exceptions import ExpiredSignatureError, PyJWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import get_settings

try:
    import structlog

    _auth_log = structlog.get_logger()
except ImportError:  # pragma: no cover
    class _AuthLogShim:
        def warning(self, *a: object, **kw: object) -> None:
            pass

    _auth_log = _AuthLogShim()


def _jwks_diag(s, step: str, err: Exception) -> None:
    if getattr(s, "environment", "") == "development":
        _auth_log.warning("jwt_decode_step", step=step, error=str(err)[:240])


bearer = HTTPBearer(auto_error=False)


@functools.lru_cache(maxsize=8)
def _jwks_client(jwks_uri: str) -> PyJWKClient:
    return PyJWKClient(jwks_uri)


def _jwks_uri_from_settings(s) -> str | None:
    if (s.supabase_jwks_url or "").strip():
        return s.supabase_jwks_url.strip()
    base = (s.supabase_url or "").strip()
    if not base:
        return None
    return f"{base.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _issuer_from_settings(s) -> str | None:
    if (s.supabase_jwt_issuer or "").strip():
        return s.supabase_jwt_issuer.strip()
    base = (s.supabase_url or "").strip()
    if not base:
        return None
    return f"{base.rstrip('/')}/auth/v1"


def _decode_jwks(token: str, s) -> str | None:
    uri = _jwks_uri_from_settings(s)
    if not uri:
        return None
    try:
        sk = _jwks_client(uri).get_signing_key_from_jwt(token)
    except PyJWTError as e:
        _jwks_diag(s, "get_signing_key", e)
        return None

    decode_kw: dict = {"algorithms": ["ES256", "RS256", "EdDSA"], "leeway": 60}
    if s.supabase_verify_audience:
        decode_kw["audience"] = s.supabase_jwt_audience
    else:
        decode_kw["options"] = {"verify_aud": False}

    if s.supabase_verify_issuer:
        iss = _issuer_from_settings(s)
        if iss:
            decode_kw["issuer"] = iss

    try:
        key = sk.key
    except AttributeError:
        key = sk

    try:
        payload = jwt.decode(token, key, **decode_kw)
    except ExpiredSignatureError as e:
        _jwks_diag(s, "jwt.decode_expired", e)
        return None
    except PyJWTError as e:
        _jwks_diag(s, "jwt.decode", e)
        return None

    sub = payload.get("sub")
    if isinstance(sub, str) and sub.strip():
        return sub.strip()
    return None


def _decode_hs256_supabase_legacy(token: str, s) -> str | None:
    if not (s.supabase_jwt_secret or "").strip():
        return None
    try:
        if s.supabase_verify_audience:
            payload = jwt.decode(
                token,
                s.supabase_jwt_secret,
                algorithms=["HS256"],
                audience=s.supabase_jwt_audience,
                leeway=60,
            )
        else:
            payload = jwt.decode(
                token,
                s.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
                leeway=60,
            )
    except PyJWTError:
        return None
    sub = payload.get("sub")
    if isinstance(sub, str) and sub.strip():
        return sub.strip()
    return None


def _decode_briefpilot(token: str, s) -> str | None:
    try:
        payload = jwt.decode(token, s.secret_key, algorithms=[s.algorithm], leeway=60)
    except PyJWTError:
        return None
    sub = payload.get("sub")
    if isinstance(sub, str) and sub.strip():
        return sub.strip()
    return None


def _sub_from_token(token: str) -> str | None:
    s = get_settings()
    for fn in (_decode_jwks, _decode_hs256_supabase_legacy, _decode_briefpilot):
        sub = fn(token, s)
        if sub:
            return sub
    return None


async def get_current_user_id(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    s = get_settings()
    if s.environment == "development" and not creds:
        return "dev-user-local"

    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user_id = _sub_from_token(creds.credentials.strip())
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_id
