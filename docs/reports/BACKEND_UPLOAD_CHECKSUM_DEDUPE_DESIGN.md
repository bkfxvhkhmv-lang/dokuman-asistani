# Backend Upload Checksum Dedupe — Design (no implementation)

> **Status:** Design **GO** — implementation in **separate PR B** (do not mix with Android share/import PR A)  
> **Problem:** [DUPLICATE_UPLOAD_BEHAVIOR_2026-06-18.md](DUPLICATE_UPLOAD_BEHAVIOR_2026-06-18.md)

---

## Product decisions (confirmed 2026-06-18)

| Decision | Verdict |
|----------|---------|
| Duplicate upload is an **error**? | **NO** — not blocking |
| Stop user / show conflict? | **NO** — redirect to existing doc |
| HTTP for duplicate | **200 OK** + `duplicate: true` |
| HTTP for duplicate | **NOT** 409 Conflict |
| UI pattern | **Toast / banner** — **NOT** modal |
| Today’s V4 analyse UX | **HOLD / poor** — no warning, re-processes, list clutter |
| PR scope | **PR B** only — separate from share/import fix (**PR A**) |

### Today: user sees **no warning**

Same PDF via V4 analyse → `201 Created`, new `document_id`, OCR + LLM + cost + shadow again, likely second list entry.

---

## Target UX (PR B)

**Toast / banner (non-blocking):**

| Lang | Copy |
|------|------|
| TR | Bu belge zaten kayıtlı. Mevcut belge açılıyor. |
| DE | Dieses Dokument ist bereits vorhanden. Das vorhandene Dokument wird geöffnet. |

**Frontend when `duplicate: true`:**

1. Do **not** wait for new OCR/LLM pipeline
2. Navigate to existing `document_id` detail / result
3. Show short toast (above)

Suggested i18n keys (implementation): `upload.duplicate.toast` (TR/DE/en in `translations.ts`).

## Current behavior

For same authenticated user + same PDF bytes:

1. `POST /api/v4/documents/` → **201 Created** every time
2. New `document_id`, new MinIO object, new DB row
3. OCR → decision_worker → summary workers run again
4. `ai_usage_events` cost row added again
5. Mobile V4 analyse (`useCoreScanJob`) has **no** upload dedupe

---

## Target behavior

If `user_id` + `checksum` already exists for an active document:

- Do **not** create a new document row
- Do **not** upload to MinIO
- Do **not** enqueue OCR / decision / summary
- Return **existing** document with explicit duplicate signal

---

## Recommended API

### New upload (unchanged semantics)

**201 Created**

```json
{
  "id": "<new_uuid>",
  "status": "pending",
  "duplicate": false
}
```

### Duplicate upload

**200 OK** (preferred over 409 — simpler mobile UX)

```json
{
  "id": "<existing_document_id>",
  "status": "<existing_status>",
  "duplicate": true,
  "existing_document_id": "<existing_document_id>",
  "filename": "<stored_filename>",
  "checksum": "<sha256>"
}
```

Optional: `message` key for i18n hook — not required in v1.

---

## Investigation answers

### A) Where checksum is computed today

`backend/app/api/documents.py` — `upload_document()`:

```python
data = await file.read()
checksum = hashlib.sha256(data).hexdigest()
```

Before storage insert; **not** used for lookup.

### B) DB column

`documents.checksum` — `String`, nullable (`Document` model + initial migration).

### C) Index / unique constraint

**None** today. No unique on `(user_id, checksum)`.

Observed: 102 documents, 61 distinct checksums — duplicates already exist in DB from re-uploads.

### D) Minimal code path (proposed)

In `upload_document()` **after** `checksum = sha256(data)`:

1. `SELECT id, filename, status FROM documents WHERE user_id = :uid AND checksum = :chk ORDER BY created_at DESC LIMIT 1`
2. If row found and document is **eligible** (see below) → return 200 duplicate response **without** MinIO/workers
3. Else → current path unchanged

Log scalar event: `upload.duplicate_detected` with `document_id`, `checksum_prefix` (12 chars) — no file content.

### E) Suggested index

Phase 1 (non-unique, safe):

```sql
CREATE INDEX ix_documents_user_checksum ON documents (user_id, checksum);
```

Phase 2 (optional, after backfill/cleanup policy):

```sql
CREATE UNIQUE INDEX uq_documents_user_checksum ON documents (user_id, checksum)
WHERE checksum IS NOT NULL AND status != 'deleted';
```

Start **non-unique** — existing duplicate rows must not break migration.

### F) Scope of match

| Dimension | Recommendation |
|-----------|----------------|
| `user_id` | **Required** — dedupe per user |
| `checksum` | **Required** — SHA256 of raw bytes |
| `filename` | **Ignore** — same content, different name still duplicate |
| Global checksum | **No** — different users may upload same utility bill template |

### G) Deleted / archived documents

**Design choice needed:**

- **Option A (recommended v1):** Only match `status IN (pending, processing, completed, action_needed, …)` — exclude soft-deleted if that status exists
- **Option B:** If user deleted doc, allow re-upload as new (new ID, re-process)

Current enum: check `DocumentStatus` — no `deleted` in schema today; hard DELETE exists on API. **v1: any existing row with same user+checksum matches.**

### H) API compatibility risk

| Consumer | Risk | Mitigation |
|----------|------|------------|
| `useCoreScanJob` | Expects 201 always | Handle 200 + `duplicate: true` → navigate to existing doc |
| `uploadDocumentV4Safe` / retry | May treat 200 as error | Accept 200 as success |
| `DocumentOut` schema | Missing fields | Add optional `duplicate`, `existing_document_id` |
| Tests expecting 201 | Break | Add duplicate cases |
| Offline queue | Re-upload same file | Beneficial — idempotent |

### I) Frontend changes (PR B)

1. `V4Document` / zod schema: optional `duplicate?: boolean`, `existing_document_id?: string`
2. `uploadDocumentV4` / `fileReq`: treat **200** as success (not only 201)
3. `useCoreScanJob.startJob`: if `duplicate: true` → toast + navigate/poll existing doc (no new OCR/LLM wait)
4. **Toast only** — no modal dialog
5. **No change** to local `findDuplicateImportByFileSize` — complementary, not replaced

---

## PR B — acceptance criteria (locked)

1. Same `user_id` + `checksum` exists → **no** new `documents` row
2. OCR worker **not** enqueued
3. `decision_worker` / LLM **not** called
4. **No** new `ai_usage_events` cost row
5. API returns **200 OK** (not 201)
6. Response includes `duplicate: true` (+ `existing_document_id`, existing `status`, `filename`)
7. Frontend navigates to **existing** document (no new OCR/LLM wait)
8. Toast/banner shown:
   - **TR:** Bu belge zaten kayıtlı. Mevcut belge açılıyor.
   - **DE:** Dieses Dokument ist bereits vorhanden. Das vorhandene Dokument wird geöffnet.

**Not in scope for PR B:** modal dialog, 409 Conflict, re-processing existing doc.

---

## PR split (do not merge scopes)

| PR | Status | Scope |
|----|--------|--------|
| **PR A** | **NOW** | Android share/import fix — Files → Share/Open → BriefPilot |
| **PR B** | **HOLD** (after PR A) | Backend checksum dedupe + index + frontend toast + `useCoreScanJob` |

**Batch 50 shadow upload:** **HOLD** until share/import (PR A) and duplicate cost risk (PR B design → impl) addressed.

### J) Tests needed

- Same bytes twice → 201 then 200, one DB row, one MinIO object
- Different users same checksum → two rows (201 both)
- Same user different bytes → two rows
- Duplicate path: no `ocr.start`, no `decision.start`, no new `ai_usage_events`
- Response body fields present

### K) Migration

**Index only** — no column change. Alembic revision: `ix_documents_user_checksum`.

---

## PASS / HOLD

| Item | Verdict |
|------|---------|
| Design | **GO** |
| Implementation (PR B) | **Separate PR** — after PR A if needed |
| Unique constraint | **HOLD** — index first |
| Mix with share/import | **NO** |

---

## Related

- [DUPLICATE_UPLOAD_BEHAVIOR_2026-06-18.md](DUPLICATE_UPLOAD_BEHAVIOR_2026-06-18.md)
- [BATCH_2_DUPLICATE_AWARE_SELECTION.md](BATCH_2_DUPLICATE_AWARE_SELECTION.md)
- [NEXT_WORK_ITEMS.md](NEXT_WORK_ITEMS.md)
