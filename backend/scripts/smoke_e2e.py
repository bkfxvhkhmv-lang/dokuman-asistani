#!/usr/bin/env python3
"""
E2E smoke (stdlib only; no pip install needed):

  health → POST /documents/ → POST /ai/explain/{id} (çoğunlukla önce 422, OCR sonra 200)
           → POST /share/{id} → GET /sync/delta

  OCR henüz bitmeden ilk explain 422 normal. Tekrar curl ile beklemek yerine:

  python3 scripts/smoke_e2e.py --wait-explain 20
  # Varsayılan yüklenen dosya: 1×1 geçerli PNG (pipeline/OCR için yeterli; çoğu OCR sıfır metin verir —
  # `--wait-explain` ile stable 200 istiyorsan gerçek tarama görseli: `--upload-file path/to/page.png`)

  # varsayılan ilk deneme aralığı 2 sn — SMOKE_WAIT_EXPLAIN_SECONDS / SMOKE_WAIT_EXPLAIN_INTERVAL

  Bearer script içinde çözülür; shell'e export etmezsen manuel curl için yine password grant kullan.


Uses a Supabase Auth **access_token** — same Supabase **project** as the API server's
**SUPABASE_JWT_SECRET** in backend `.env`:

  Dashboard → Project Settings → API → **JWT signing key** (« JWT Secret », long random string).

  Do **not** use the anon / public anon key — that is client-side for PostgREST, not HS256 JWT signing secret for user sessions.

  export SUPABASE_ACCESS_TOKEN='eyJ...'
  export API_BASE_URL=http://127.0.0.1:8000   # optional; use 127.0.0.1 in Docker (not 'localhost')
  python3 scripts/smoke_e2e.py

**Terminal notu:** Hazır Bearer JWT yaklaşık 1 saat geçerlidir; shell süre saklamıyorsun — yenile ya da şifreyle otomatik al.

**Otomatik token (önerilir — elle export’a gerek yok):** mobil uygulama Supabase client ile
yeniler (`autoRefreshSession`); terminal için script her çalışınca yeniden şifreyle giriş yapar:

  export SUPABASE_URL=https://YOUR_REF.supabase.co
  export SUPABASE_ANON_KEY=eyJ...    # Dashboard → API → anon (public); JWT signing secret DEĞİL
  export SUPABASE_LOGIN_EMAIL=test@example.com
  export SMOKE_SUPABASE_PASSWORD='••••••••'

  python3 scripts/smoke_e2e.py

(Alternatif isimler: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SMOKE_SUPABASE_EMAIL` / `SMOKE_SUPABASE_PASSWORD`.)

**Güvenlik (kritik):** Şifreyi argv ile verme — shell geçmişine düşer.

  ❌ Kötü:  ``python3 scripts/smoke_e2e.py --login-password hunter2``
  ✅ Daha iyi: ``export SMOKE_SUPABASE_PASSWORD='…'``  (veya ``SUPABASE_LOGIN_PASSWORD`` — script ikisini de okur)

Docker (must run Compose from backend/ where ./scripts exists; rebuild once if scripts missing):

  docker compose build api
  docker compose up -d --force-recreate api

If the API exits with ImportError (`No module named 'jwt'`), the image predates PyJWT —
rebuild is required (`pyproject.toml` already lists PyJWT[crypto]).
  docker compose exec -e SUPABASE_ACCESS_TOKEN='eyJ...' api python3 scripts/smoke_e2e.py

Run smoke from your Mac (host); token either export veya dört env ile otomatik:

  export API_BASE_URL=http://127.0.0.1:8000
  export SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_LOGIN_EMAIL=... SMOKE_SUPABASE_PASSWORD=...
  # POST /documents/ can take minutes with inline Paddle; default client wait is 600s.
  export SMOKE_UPLOAD_TIMEOUT=900    # optional
  python3 scripts/smoke_e2e.py --wait-explain 20    # OCR sonrası explain 200'ü bekle (opsiyonel)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from typing import Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

# Varsayılan yükleme: 1×1 geçerli PNG (düz `.bin` Pillow’da patlar → OCR hiç yazamaz, belge pending kalır).
_SMOKE_PIXEL_PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
)


def die(msg: str, code: int = 1) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    raise SystemExit(code)


def explain_401_stderr() -> None:
    sys.stderr.write(
        "\n"
        "401 Invalid token — the API could not verify your Bearer JWT.\n\n"
        "  Current (ECC / RS256) tokens: set SUPABASE_URL=https://YOUR_REF.supabase.co in backend/.env\n"
        "  so the API can load JWKS from .../auth/v1/.well-known/jwks.json\n\n"
        "  Legacy HS256 tokens only: also set SUPABASE_JWT_SECRET (Dashboard → Legacy JWT secret).\n\n"
        "  Use a real session access_token from the same Supabase project; then:\n"
        "  docker compose up -d --force-recreate api\n\n"
    )


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or not str(raw).strip():
        return default
    try:
        return max(0, int(str(raw).strip(), 10))
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None or not str(raw).strip():
        return default
    try:
        return float(str(raw).strip())
    except ValueError:
        return default


def _read_response(req: Request, timeout: float = 120.0) -> tuple[int, str]:
    """Return (status_code, body_text)."""
    try:
        with urlopen(req, timeout=timeout) as resp:  # noqa: S310 — URLs from CLI / env only
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, raw


def _part_file(
    *,
    boundary: bytes,
    field_name: str,
    filename: str,
    content: bytes,
    content_type: str,
) -> bytes:
    crlf = b"\r\n"
    head = (
        b"--"
        + boundary
        + crlf
        + f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"'.encode()
        + crlf
        + f"Content-Type: {content_type}".encode()
        + crlf
        + crlf
    )
    return head + content + crlf


def guess_multipart_content_type(remote_name: str) -> str:
    n = (remote_name or "").lower()
    if n.endswith(".png"):
        return "image/png"
    if n.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if n.endswith(".webp"):
        return "image/webp"
    if n.endswith(".gif"):
        return "image/gif"
    if n.endswith(".pdf"):
        return "application/pdf"
    return "application/octet-stream"


def multipart_upload(
    url: str,
    *,
    file_bytes: bytes,
    remote_name: str,
    extra_headers: Mapping[str, str],
) -> tuple[int, str]:
    boundary = f"BpSmoke-{uuid.uuid4().hex}".encode("ascii")
    body = _part_file(
        boundary=boundary,
        field_name="file",
        filename=remote_name,
        content=file_bytes,
        content_type=guess_multipart_content_type(remote_name),
    ) + (b"--" + boundary + b"--\r\n")
    req = Request(url, data=body, method="POST")  # noqa: S310
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary.decode('ascii')}")
    for k, v in extra_headers.items():
        req.add_header(k, v)
    # Inline OCR + first Paddle load can exceed 120s; env override for huge assets.
    return _read_response(req, timeout=_env_float("SMOKE_UPLOAD_TIMEOUT", 600.0))


def json_post(url: str, payload: dict, headers: Mapping[str, str]) -> tuple[int, str]:
    body = json.dumps(payload).encode("utf-8")
    req = Request(url, data=body, method="POST")  # noqa: S310
    req.add_header("Content-Type", "application/json")
    for k, v in headers.items():
        req.add_header(k, v)
    return _read_response(req)


def json_get(url: str, headers: Mapping[str, str]) -> tuple[int, str]:
    req = Request(url, method="GET")  # noqa: S310
    for k, v in headers.items():
        req.add_header(k, v)
    return _read_response(req)


def post_ai_explain(base: str, doc_id: str, auth: Mapping[str, str]) -> tuple[int, str]:
    return json_post(f"{base}/ai/explain/{doc_id}", {}, dict(auth))


def fetch_document_status_display(base: str, doc_id: str, auth: Mapping[str, str]) -> str:
    sc, body = json_get(f"{base}/documents/{doc_id}", auth)
    if sc != 200:
        return f"<GET /documents/ {sc}>"
    try:
        dj = json.loads(body)
        return str(dj.get("status", "?"))
    except json.JSONDecodeError:
        return "?"


def consume_explain_stdout(code: int, text: str) -> bool:
    """Echo body; fatal on unexpected HTTP. Returns True iff 200."""
    try:
        ej = json.loads(text) if (text or "").strip() else {}
    except json.JSONDecodeError:
        ej = {}
    detail = ej.get("detail") if isinstance(ej, dict) else None

    if code == 401:
        explain_401_stderr()

    if code == 422:
        if isinstance(ej, dict) and ej:
            print(json.dumps(ej, indent=2))
        else:
            print(text or "")
        ok_detail = isinstance(detail, str) and any(
            sub in detail.lower()
            for sub in (
                "no ocr/text row",
                "usable text",
                "readable content",
                "pillow",
                "paddle",
                "empty ocr",
                # legacy/other deployments
                "extracted text",
            )
        )
        if detail and not ok_detail:
            print(f"(hint) Unexpected 422 detail (still OK exit): {detail!r}", file=sys.stderr)
        return False

    if code == 200:
        if isinstance(ej, dict) and ej:
            print(json.dumps(ej, indent=2))
        else:
            print(text or "")
        print("(hint) Explain returned 200 — OCR/data ready (or cached meta).", file=sys.stderr)
        return True

    die(text or f"explain failed with unexpected HTTP {code}")


def fetch_password_grant_access_token(
    *,
    supabase_url: str,
    anon_key: str,
    email: str,
    password: str,
) -> str:
    """Same flow as Expo/RN Supabase.signInWithPassword → fresh access JWT for smoke runs."""
    base = supabase_url.strip().rstrip("/")
    if not base.startswith("http"):
        die(f"SUPABASE_URL must include scheme (got {supabase_url!r})")

    anon = anon_key.strip()
    if not anon:
        die("SUPABASE_ANON_KEY is empty for password grant.")

    token_url = f"{base}/auth/v1/token?grant_type=password"
    hdrs = {"apikey": anon, "Authorization": f"Bearer {anon}"}
    code, text = json_post(token_url, {"email": email.strip(), "password": password}, hdrs)
    if code != 200:
        sys.stderr.write(
            f"\nSupabase login failed [{code}] at {token_url}\n{text[:700]}\n",
            file=sys.stderr,
        )
        die("Password grant refused (check SUPABASE_LOGIN_* credentials and anon key project).")

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        die(f"Supabase login: unexpected body: {text[:400]}")

    tok = data.get("access_token")
    if not tok:
        die(f'Supabase login JSON missing access_token: {list(data.keys())!r}')
    return str(tok)


def resolve_bearer_access_token(cli_token: str | None, args: argparse.Namespace) -> str:
    """Prefer explicit JWT; otherwise password grant via env/cli."""
    explicit = (cli_token or "").strip()
    if explicit:
        return explicit

    supabase_url = (getattr(args, "supabase_url", None) or "").strip()
    anon = (getattr(args, "anon_key", None) or "").strip()
    email = (getattr(args, "login_email", None) or "").strip()
    pw = getattr(args, "login_password", None)
    pw_s = pw if pw is not None else ""

    missing = []
    if not supabase_url:
        missing.append("SUPABASE_URL / --supabase-url")
    if not anon:
        missing.append("SUPABASE_ANON_KEY / --anon-key")
    if not email:
        missing.append("SUPABASE_LOGIN_EMAIL / --login-email")
    if not pw_s:
        missing.append("SMOKE_SUPABASE_PASSWORD / SUPABASE_LOGIN_PASSWORD / --login-password")

    if missing:
        die(
            "No SUPABASE_ACCESS_TOKEN / --token, and incomplete password-login config:\n  "
            + "\n  ".join(missing)
            + "\n\n"
            + "Set a user JWT explicitly, OR set all four vars for grant_type=password.\n",
            2,
        )

    print("(info) Fetching Supabase access_token via password grant (expires ~1h, like manual curl).\n")
    return fetch_password_grant_access_token(
        supabase_url=supabase_url,
        anon_key=anon,
        email=email,
        password=pw_s,
    )


def wait_for_health(base: str, attempts: int) -> tuple[int, str]:
    """Retry GET /health/ on connection errors (startup race, RST, refusal)."""
    url = f"{base.rstrip('/')}/health/"
    last: BaseException | None = None
    # URLError wraps some cases; RST/refusal often arrive as ConnectionError (not URLError).
    _retryable = (URLError, ConnectionError, TimeoutError, BrokenPipeError)
    for i in range(max(1, attempts)):
        try:
            return json_get(url, {})
        except _retryable as e:
            last = e
            if i < attempts - 1:
                time.sleep(1.0)
    die(
        f"Cannot reach {url!r} after ~{attempts}s: {last!s}\n"
        "  (Is uvicorn up? If API crashes on start, check: docker compose logs api --tail=80)\n",
        3,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="E2E: health → upload → explain → share → delta")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("API_BASE_URL", "http://127.0.0.1:8000"),
        help="Prefer 127.0.0.1 inside Linux containers (avoids localhost→IPv6 ::1 refusal)",
    )
    parser.add_argument(
        "--ready-seconds",
        type=int,
        default=_env_int("SMOKE_READY_SECONDS", 30),
        metavar="N",
        help="Retry /health/ this many seconds on connection refused (startup race)",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("SUPABASE_ACCESS_TOKEN") or os.environ.get("BP_ACCESS_TOKEN"),
        help="Supabase user access JWT — if omitted, password grant (--login-* / SUPABASE_LOGIN_*) is used.",
    )
    parser.add_argument(
        "--supabase-url",
        default=os.environ.get("SUPABASE_URL", ""),
        metavar="URL",
        help="https://YOUR_REF.supabase.co (needed when using password grant)",
    )
    parser.add_argument(
        "--anon-key",
        default=os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or "",
        metavar="KEY",
        help="Supabase anon (public) key — not the JWT signing secret",
    )
    parser.add_argument(
        "--login-email",
        default=os.environ.get("SUPABASE_LOGIN_EMAIL") or os.environ.get("SMOKE_SUPABASE_EMAIL") or "",
        metavar="ADDR",
        help="Test-user email for Supabase Auth password grant",
    )
    parser.add_argument(
        "--login-password",
        default=os.environ.get("SMOKE_SUPABASE_PASSWORD") or os.environ.get("SUPABASE_LOGIN_PASSWORD") or "",
        metavar="SECRET",
        help=(
            "Discouraged: ends up in argv/shell history. Prefer env: "
            "SMOKE_SUPABASE_PASSWORD or SUPABASE_LOGIN_PASSWORD (exported, not pasted here)."
        ),
    )
    parser.add_argument(
        "--since",
        default="1990-01-01T00:00:00Z",
        help="ISO8601 lower bound for /sync/delta",
    )
    parser.add_argument(
        "--skip-explain",
        action="store_true",
        help="Do not POST /ai/explain/{uploaded_doc} (default: run; expect 422 until OCR fills text)",
    )
    parser.add_argument(
        "--upload-file",
        default=(os.environ.get("SMOKE_UPLOAD_FILE") or "").strip(),
        metavar="PATH",
        help="Upload this path instead of the built-in 1×1 PNG. Env: SMOKE_UPLOAD_FILE",
    )
    parser.add_argument(
        "--wait-explain",
        type=float,
        default=_env_float("SMOKE_WAIT_EXPLAIN_SECONDS", 0.0),
        metavar="SEC",
        help="Max seconds to poll POST /ai/explain until 200 after first try (0=off). Env: SMOKE_WAIT_EXPLAIN_SECONDS",
    )
    parser.add_argument(
        "--wait-explain-interval",
        type=float,
        default=_env_float("SMOKE_WAIT_EXPLAIN_INTERVAL", 2.0),
        metavar="SEC",
        help="Sleep between explain polls (default 2; min 0.25). Env: SMOKE_WAIT_EXPLAIN_INTERVAL",
    )
    args = parser.parse_args()
    bearer = resolve_bearer_access_token(args.token, args)

    base = args.base_url.rstrip("/")
    auth = {"Authorization": f"Bearer {bearer}"}

    try:
        # 1) health — no Bearer (retry until API listens)
        code, text = wait_for_health(base, args.ready_seconds)
        print(f"== health [/health/] [{code}]")
        if code != 200:
            die(text or "empty response")
        print(json.dumps(json.loads(text), indent=2))

        # 2) upload — varsayılan 1×1 PNG (geçersiz/binary `.bin` ile OCR sık sık hiç yazmaz → sürekli pending)
        uf = (args.upload_file or "").strip()
        if uf:
            try:
                with open(uf, "rb") as fp:
                    file_blob = fp.read()
            except OSError as e:
                die(f"cannot read --upload-file {uf!r}: {e}")
            remote_name = os.path.basename(uf) or "smoke_upload.bin"
            print(f"(info) Uploading local file as {remote_name!r}")
        else:
            file_blob = _SMOKE_PIXEL_PNG
            remote_name = "smoke_e2e.png"
            print("(info) Using built-in 1×1 PNG (OCR often empty — use --upload-file for readable text).\n")

        code, text = multipart_upload(
            f"{base}/documents/",
            file_bytes=file_blob,
            remote_name=remote_name,
            extra_headers=dict(auth),
        )
        print(f"== upload [/documents/] [{code}]")
        if code != 201:
            if code == 401:
                explain_401_stderr()
            die(text or "upload failed without body")
        up = json.loads(text)
        doc_id = up.get("id")
        print(json.dumps(up, indent=2))
        if not doc_id:
            die(f"unexpected upload payload: {up!r}")

        explain_ok = False
        # 2b) LLM explain — yeni yüklemede OCR/metin yoksa 422 (normal).
        if not args.skip_explain:
            code, text = post_ai_explain(base, doc_id, auth)
            doc_status = fetch_document_status_display(base, doc_id, auth)
            print(f"== explain [POST /ai/explain/{doc_id}] [{code}] doc={doc_status}")
            explain_ok = consume_explain_stdout(code, text)
        elif args.wait_explain and args.wait_explain > 0:
            print(
                "(info) --skip-explain set; polling explain only (--wait-explain).\n",
                file=sys.stderr,
            )

        # 2c) OCR bitene kadar explain'i tekrar dene — shell'e token export gerekmez
        wait_cap = min(300.0, max(0.0, float(args.wait_explain or 0.0)))
        poll_iv = max(0.25, float(args.wait_explain_interval or 2.0))
        if wait_cap > 0 and not explain_ok:
            deadline = time.monotonic() + wait_cap
            poll_n = 0
            while time.monotonic() < deadline and not explain_ok:
                time.sleep(poll_iv)
                if time.monotonic() >= deadline:
                    break
                poll_n += 1
                code, text = post_ai_explain(base, doc_id, auth)
                doc_status = fetch_document_status_display(base, doc_id, auth)
                rem = max(0.0, deadline - time.monotonic())
                print(
                    f"== explain (poll #{poll_n}, interval {poll_iv}s, ~{rem:.1f}s left, doc={doc_status}) "
                    f"[POST /ai/explain/{doc_id}] [{code}]",
                )
                explain_ok = consume_explain_stdout(code, text)

            if not explain_ok:
                print(
                    f"(hint) explain still not HTTP 200 after {wait_cap:g}s. "
                    "Likely: worker-ocr/worker-ai off or crashing — `docker compose up -d --build worker-ocr worker-ai` "
                    "and `docker compose logs worker-ocr --tail=100`. PDFs: rebuild worker after PyMuPDF. "
                    "Local smoke without workers: set `PROCESS_OCR_INLINE_DEV=true` in backend/.env (development). "
                    "Default 1×1 PNG has empty OCR. Share/delta still OK.",
                    file=sys.stderr,
                )

        # 3) share
        code, text = json_post(
            f"{base}/share/{doc_id}",
            {"ttl": "24h", "max_views": 0},
            auth,
        )
        print(f"== share [POST /share/{doc_id}] [{code}]")
        if code != 200:
            die(text or "share failed")
        shr = json.loads(text)
        print(json.dumps(shr, indent=2))
        if not shr.get("share_url") or not shr.get("token"):
            die(f"unexpected share payload: {shr!r}")

        # 4) delta — frontend alias
        delta_url = f"{base}/sync/delta?{urlencode({'since': args.since})}"
        code, text = json_get(delta_url, auth)
        print(f"== delta [GET /sync/delta] [{code}]")
        if code != 200:
            die(text or "delta failed")
        dj = json.loads(text)
        print(json.dumps(dj, indent=2))
        changed = dj.get("changed") or []
        ids = [x.get("id") for x in changed if isinstance(x, dict)]
        if doc_id not in ids:
            print(
                f"(hint) doc id {doc_id!r} not in delta.changed[] — check since={args.since!r} / DB.",
                file=sys.stderr,
            )

        print("\nOK: smoke chain completed.")

    except (URLError, ConnectionError, TimeoutError, BrokenPipeError) as e:
        die(
            f"Network error ({args.base_url!r}): {e!s}\n"
            "(hint) After POST /documents/: API may have OOM-crashed during inline Paddle OCR, or closed "
            "before response. Try: docker compose logs api --tail=120 · raise Docker memory · "
            "SMOKE_UPLOAD_TIMEOUT=900 · or turn off PROCESS_OCR_INLINE_DEV and run worker-ocr.",
            3,
        )


if __name__ == "__main__":
    main()
