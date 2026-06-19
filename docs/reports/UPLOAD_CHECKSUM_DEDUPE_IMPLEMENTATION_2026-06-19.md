# Upload Checksum Dedupe — Implementation Report (2026-06-19)

**Branch:** `fix/upload-checksum-dedupe`  
**Status:** Report for approval — **not committed yet**

---

## A) Files changed

| File | Change |
|------|--------|
| `backend/app/api/documents.py` | Pre-upload checksum lookup; 200 duplicate / 201 new |
| `backend/app/schemas/document.py` | `duplicate`, `existing_document_id` on `DocumentOut` |
| `backend/tests/test_documents.py` | Duplicate + pending/failed existing doc tests |
| `src/services/v4FileService.ts` | `V4Document` duplicate fields |
| `src/hooks/useCoreScanJob.ts` | Duplicate path: skip OCR poll when completed |
| `src/hooks/useOcrMvpJob.ts` | `onDuplicate` timing callback |
| `src/features/ocr-mvp/OcrMvpScreen.tsx` | Toast + v4DocId save guard + auto-open existing |
| `src/services/v4EnqueueUpload.ts` | Use `existing_document_id` when duplicate |
| `src/i18n/translations.ts` | `ocr.upload.duplicate_toast` (DE/TR/EN) |
| `src/__tests__/useCoreScanJob.test.tsx` | Duplicate upload unit test |

**Not touched:** Android share, picker, OCR pipeline, parser/routing/telemetry, package.json, .env

---

## B) Backend duplicate check

Before MinIO upload / DB insert:

```python
existing = await _find_duplicate_document(db, user_id, checksum)
# SELECT ... WHERE user_id = ? AND checksum = ? ORDER BY created_at ASC LIMIT 1
```

If found:
- Skip `upload_file`, `db.add`, OCR enqueue
- Return **200 OK** with `duplicate: true`, `existing_document_id`

If not found: unchanged flow → **201 Created**, `duplicate: false`

**Dedupe key:** `user_id + checksum` only (SHA-256 of raw bytes).  
No filename match. No OCR text fuzzy match. Different users may upload same bytes independently.

---

## C) Response schema before / after

**Before (always 201):**
```json
{
  "id": "...",
  "status": "pending",
  "checksum": "...",
  "version": 1,
  "updated_at": "..."
}
```

**After — new upload (201):**
```json
{
  "id": "new-uuid",
  "status": "pending",
  "checksum": "...",
  "version": 1,
  "updated_at": "...",
  "duplicate": false,
  "existing_document_id": null
}
```

**After — duplicate (200):**
```json
{
  "id": "existing-uuid",
  "status": "completed|pending|failed",
  "checksum": "...",
  "version": 1,
  "updated_at": "...",
  "duplicate": true,
  "existing_document_id": "existing-uuid"
}
```

---

## D) Tests added / updated

| Test | Asserts |
|------|---------|
| `test_upload_dev_mode` | 201, `duplicate: false` |
| `test_upload_duplicate_returns_existing` | 200, same id, no upload/OCR |
| `test_upload_duplicate_does_not_reprocess_pending` | 200, status pending, no OCR |
| `test_upload_duplicate_does_not_reprocess_failed` | 200, status failed, no OCR |
| `useCoreScanJob` duplicate test | No status poll; fetches `/result` once |

**Different-user case:** Covered by design (lookup scoped to `user_id`). No cross-user block.

---

## E) Test results

**Backend (Docker `api` container):**
```
6 passed, 1 skipped (test_documents.py)
```

**Frontend:**
```
7 passed (useCoreScanJob.test.tsx)
```

---

## F) Frontend duplicate handling

1. **`useCoreScanJob`:** If `duplicate: true` + `status: completed` → fetch worker result directly (no OCR polling). Sets `duplicateDetected: true`. Calls `onDuplicate`.
2. **`OcrMvpScreen`:** Toast via `ocr.upload.duplicate_toast`:
   - DE: *Dieses Dokument ist bereits vorhanden. Das vorhandene Dokument wird geöffnet.*
   - TR: *Bu belge zaten kayıtlı. Mevcut belge açılıyor.*
3. **Save guard:** `handleSaveToDocuments` skips `ADD_DOKUMENT` if local doc already has same `v4DocId`.
4. **Auto-open:** When duplicate completes and local doc exists → navigate to `/detail`.

List count stays correct: backend does not create a second row → sync/list does not gain a duplicate entry.

---

## G) Manual duplicate upload result

**Attempted** against `localhost:8000` after `docker compose restart api`.

- Pre-restart (old code): two uploads → two **201**, `docs_after=2` (confirms bug).
- Post-restart: **API container failed** — Alembic `Can't locate revision identified by '0003'` (pre-existing env drift, unrelated to this PR).

**Conclusion:** Live HTTP smoke blocked by API startup; unit tests in container validate new code path. Re-run manual smoke after API migration fix + restart.

---

## H) Cost / AI usage observation

Pre-fix duplicate test (same session): second upload would enqueue OCR + LLM → new `ai_usage_events` row.

With fix (unit-tested): duplicate path never calls `process_ocr.delay` → no new worker chain → no new cost row expected.

Could not verify live `ai_usage_events` delta — API down after restart.

---

## I) Git status --short (implementation files only)

```
 M backend/app/api/documents.py
 M backend/app/schemas/document.py
 M backend/tests/test_documents.py
 M src/__tests__/useCoreScanJob.test.tsx
 M src/features/ocr-mvp/OcrMvpScreen.tsx
 M src/hooks/useCoreScanJob.ts
 M src/hooks/useOcrMvpJob.ts
 M src/i18n/translations.ts
 M src/services/v4EnqueueUpload.ts
 M src/services/v4FileService.ts
```

---

## J) Recommendation

**PASS** for code review and commit approval.

**Follow-up (separate):**
- Fix API container Alembic `0003` drift → live duplicate smoke on device
- Optional DB index: `(user_id, checksum)` for faster lookup at scale
- Share/import PR A remains **HOLD** per product decision

---

## Note for Kimi

Duplicate detection uses **checksum only** (`user_id + SHA-256 bytes`).  
Do **not** add OCR-text fuzzy dedupe or filename matching — checksum is the safe, deterministic rule.
