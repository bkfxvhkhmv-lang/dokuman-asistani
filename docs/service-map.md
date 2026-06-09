# BriefPilot — Service Map & Naming Standard

## Naming Rule

**Never say only "backend."** Always use the service name.

| Service name | Role |
|---|---|
| `briefpilot-mobile` | React Native / Expo app |
| `briefpilot-ocr-api` | OCR upload/analyze/result/download service |
| `briefpilot-core-api` | v4 storage, sync, search, metadata API |
| `briefpilot-ocr-worker` | OCR queue worker (future, if split out) |
| `briefpilot-ai-worker` | LLM summary/label/explain worker (future, if split out) |

---

## Current Paths

| Service | Path |
|---|---|
| `briefpilot-mobile` | `/Users/bayramgul/briefpilot` |
| `briefpilot-ocr-api` | `/Users/bayramgul/briefpilot_ocr_mvp` |
| `briefpilot-core-api` | `/Users/bayramgul/briefpilot/backend` |

Physical rename: **HOLD** — docs naming first; rename later to avoid breaking scripts/paths.

---

## Service Details

### briefpilot-ocr-api

**What it does:** Accepts a document file from the mobile app, runs OCR via ABBYY/Google/Paddle, returns structured results.

**env key:** `OCR_MVP_BASE`

**Endpoints:**
```
GET  /health/
POST /documents/analyze          → { job_id, status }
GET  /documents/{job_id}/result  → OcrMvpJobStatus (polling)
GET  /documents/{job_id}/download
POST /documents/{job_id}/accepted
POST /documents/{job_id}/corrections
POST /ai/label
```

**Infrastructure:** SQLite + local filesystem — no Postgres, no Redis, no MinIO.

**Start (local):**
```bash
cd /Users/bayramgul/briefpilot_ocr_mvp
bash start_backend.sh
```

---

### briefpilot-core-api

**What it does:** v4 persistent storage, document sync/delta, search (hybrid FTS + vector), share links, marketplace rules.

**env key:** `API_BASE` (e.g. `https://api.briefpilot.de/api/v4`)

**Endpoints:**
```
GET  /api/v4/health/
POST /api/v4/documents/
GET  /api/v4/documents/{id}
GET  /api/v4/sync/delta
POST /api/v4/search/
POST /api/v4/share/{doc_id}
```

**Infrastructure:** PostgreSQL + pgvector, Redis, MinIO/S3, Celery workers.

**Start:** Docker Compose required (`briefpilot/backend/docker-compose.yml`).

---

### briefpilot-mobile

**What it does:** React Native / Expo SDK 54 app. Calls `briefpilot-ocr-api` and `briefpilot-core-api`; auth via Supabase.

**Env keys (mobile → service):**

| Env key | Points to | Purpose |
|---|---|---|
| `OCR_MVP_BASE` | `briefpilot-ocr-api` | OCR upload/analyze/result/download |
| `API_BASE` | `briefpilot-core-api` | v4 sync, search, share, metadata |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Auth | User login, JWT for `briefpilot-core-api` |

**Config resolution order** (`src/config.ts`):
1. `extra.OCR_MVP_BASE` / `extra.API_BASE` (from `app.config.js`)
2. `process.env.EXPO_PUBLIC_OCR_BASE` / `process.env.API_BASE`
3. Expo Metro host auto-detect (dev only)
4. `EXPO_PUBLIC_DEVICE_IP` (dev only)
5. Fallback: `http://127.0.0.1:8000` (dev) / `https://api.briefpilot.app` (prod)

---

## Debug Rule

Before any smoke, debug, or infra work, answer these four questions:

1. **Which service does the app call?** (`briefpilot-ocr-api` or `briefpilot-core-api`)
2. **Which env key points to it?** (`OCR_MVP_BASE` or `API_BASE`)
3. **Which endpoint is being tested?** (e.g. `/documents/analyze`)
4. **Which repo/path owns it?** (e.g. `briefpilot_ocr_mvp/api/main.py`)

---

## PR #23 Lesson (2026-06-09)

**What went wrong:** `briefpilot-core-api` was inspected first — it requires Docker + Postgres + Redis and has no `/documents/analyze` endpoint. Hours spent on Homebrew Postgres/pgvector/Redis setup before discovering the wrong service was targeted.

**Root cause:** "backend" was used ambiguously for both services.

**Fix:** The actual OCR upload/smoke service is `briefpilot-ocr-api` (`briefpilot_ocr_mvp/`). It uses SQLite, needs no Docker, starts with `bash start_backend.sh`. Health confirmed PASS once correct service was started.

---

## Future Rename Plan

| Phase | Action | When |
|---|---|---|
| 1 | Docs naming only (this file) | Done |
| 2 | Script aliases / comments updated | Next relevant PR |
| 3 | Optional physical folder rename | Only when all scripts/paths confirmed safe |
