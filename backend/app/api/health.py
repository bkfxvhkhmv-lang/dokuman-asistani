from fastapi import APIRouter
from datetime import datetime, timezone

from app.config import get_settings
from app.api.auth import _jwks_uri_from_settings

router = APIRouter()


@router.get("/health/")
async def health():
    ts = datetime.now(timezone.utc).isoformat()
    out: dict = {"status": "ok", "ts": ts}
    s = get_settings()
    # Help debug "Invalid token" without exposing secrets (development only).
    if s.environment == "development":
        jwks_uri = _jwks_uri_from_settings(s)
        out["auth_hints"] = {
            "supabase_url_configured": bool((s.supabase_url or "").strip()),
            "jwks_uri": jwks_uri,
            "process_ocr_inline_dev": bool(s.process_ocr_inline_dev),
            "ocr_enabled": bool(s.ocr_enabled),
            "hint": (
                "Bearer must be a valid Supabase user access_token; API verifies via JWKS "
                "when supabase_url is set. If jwks_uri is null, asymmetric tokens cannot be verified."
                if not jwks_uri
                else "If curl still returns Invalid token: token likely expired (~1h); fetch a new one."
            ),
            "verify_audience": s.supabase_verify_audience,
            "verify_issuer": s.supabase_verify_issuer,
        }
    return out
