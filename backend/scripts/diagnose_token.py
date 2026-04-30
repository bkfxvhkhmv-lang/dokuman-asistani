#!/usr/bin/env python3
"""
JWT smoke diagnostic — run INSIDE api container next to backend code:

  docker compose exec -e SUPABASE_ACCESS_TOKEN='your_token' api python scripts/diagnose_token.py

Prints JWT header alg/kid (no verification), resolves JWKS URL from Settings,
tests JWKS GET, attempts same decode logic as auth (no secrets printed).
Requires SUPABASE_ACCESS_TOKEN env in container (export before exec).
"""

from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if cwd not in sys.path:
        sys.path.insert(0, cwd)

    os.chdir(cwd)

    tok = os.environ.get("SUPABASE_ACCESS_TOKEN") or os.environ.get("BP_ACCESS_TOKEN")
    if not tok or not tok.strip():
        print("Set SUPABASE_ACCESS_TOKEN (Bearer payload only, no prefix).", file=sys.stderr)
        return 2

    tok = tok.replace("Bearer ", "").strip()

    parts = tok.split(".")
    if len(parts) != 3:
        print("Not a JWT (expected 3 segments).", file=sys.stderr)
        return 2

    pad = "=" * (-len(parts[0]) % 4)
    hdr = json.loads(base64.urlsafe_b64decode(parts[0] + pad))
    print("JWT header:")
    print(json.dumps(hdr, indent=2))

    pad2 = "=" * (-len(parts[1]) % 4)
    try:
        pl = json.loads(base64.urlsafe_b64decode(parts[1] + pad2))
    except json.JSONDecodeError as e:
        print("payload b64decode failed:", e, file=sys.stderr)
        return 2

    # Safe subset — never print full JWT
    peek = {}
    for k in ("sub", "iss", "aud", "exp", "iat", "role"):
        if k in pl:
            peek[k] = pl[k]
    print("JWT payload subset:", json.dumps(peek, indent=2))

    from app.config import get_settings

    get_settings.cache_clear()
    s = get_settings()

    su = (s.supabase_url or "").strip()
    sj = (s.supabase_jwks_url or "").strip()
    ss = len((getattr(s, "supabase_jwt_secret", None) or "").strip())

    print("\nFrom loaded Settings:")
    print("  SUPABASE_URL length:", len(su), "(must be >0 for JWKS / Current ECC tokens)")
    print("  SUPABASE_JWKS_URL length:", len(sj))
    print("  SUPABASE_JWT_SECRET length:", ss, "(Legacy HS256 only)")

    from app.api.auth import _decode_jwks, _jwks_uri_from_settings

    uri = _jwks_uri_from_settings(s)
    print("\nResolved JWKS URL:", uri or "(none — empty SUPABASE_URL and SUPABASE_JWKS_URL)")

    if uri:
        req = urllib.request.Request(uri)
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                status = r.status
                body = r.read()
            print("JWKS HTTPS GET:", status, "bytes=", len(body))
            try:
                jwks = json.loads(body.decode("utf-8"))
                nkeys = len((jwks or {}).get("keys", []))
                print("JWKS JSON keys[].length:", nkeys)
            except json.JSONDecodeError:
                print("JWKS response is not JSON")
        except urllib.error.URLError as e:
            print("JWKS fetch FAILED (container cannot reach Supabase?):", repr(e))

    sub = _decode_jwks(tok, s)
    print("\n_decode_jwks result sub:", repr(sub))

    # Optional: issuer note
    if hdr.get("alg") == "HS256" and uri:
        print(
            "\n(note) Token alg is HS256 — verify with LEGACY SUPABASE_JWT_SECRET, "
            "not JWKS.",
            file=sys.stderr,
        )

    return 0 if sub else 1


if __name__ == "__main__":
    raise SystemExit(main())
