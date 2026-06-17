# #138 Analysieren Migration — PR Report

**Date:** 2026-06-17  
**PR:** https://github.com/bkfxvhkhmv-lang/dokuman-asistani/pull/138  
**Branch:** `fix/138-analysieren-core-api`  
**Commit:** `8fff7037926bcd65325f924827761d7478068bd7`

---

## A) Branch / HEAD

- Branch: `fix/138-analysieren-core-api`
- HEAD: `8fff7037926bcd65325f924827761d7478068bd7`
- Base: `main` (`17475277a99b2f9372ab30fcb76eee3de30f7fbf`)

---

## B) Commit Hash

`8fff7037926bcd65325f924827761d7478068bd7`

Commit message:
```text
feat(detail): migrate Analysieren to core-api backend

- Replace legacy OCR MVP POST /documents/analyze with new backend
  POST /documents/ + GET /documents/{id}/result polling.
- Keep protected-field policy: titel/typ/absender/customTitle/userOrdner
  are never overwritten.
- Add suppressAlert option to enqueueV4Upload so the hook can own
  its own error UX.
- Add integration test verifying the new upload path.

Refs #138
```

---

## C) PR Number / Link

- **PR #138:** https://github.com/bkfxvhkhmv-lang/dokuman-asistani/pull/138

---

## D) Changed Files

```text
docs/audits/2026-06-17_138-analysieren-migration-final-report.md
docs/audits/2026-06-17_upload-scan-analyze-chain-audit.md
docs/reports/REPORT_INDEX.md
src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx
src/features/detail/hooks/useAnalyzeSavedDocument.ts
src/services/v4EnqueueUpload.ts
```

---

## E) Implementation Summary

- `src/features/detail/hooks/useAnalyzeSavedDocument.ts` rewritten.
  - Removed runtime dependency on legacy `useOcrMvpJob`, `ocrMvpToV4Document`, and `buildAnalyzedDocumentUpdate`.
  - Status is now derived from `dok.v4JobStatus`:
    - `pending` → `uploading`
    - `processing` → `processing`
    - `completed` → `done`
    - `failed` → `error`
  - `startAnalyze` resolves the source file via `buildAnalyseFileFromDocument` and calls `enqueueV4Upload(dispatch, dok.id, fileUri, fileName, { suppressAlert: true })`.
- `src/services/v4EnqueueUpload.ts` extended with an optional `EnqueueV4UploadOptions` parameter (`suppressAlert`) so the hook can own its own error UX without duplicate Alerts.
- `src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx` added to verify the new path.

---

## F) Backend Contract Smoke

Local backend stack running on `localhost:8000`:

```text
$ curl -s http://localhost:8000/api/v4/health/
{"status":"ok", ... "process_ocr_inline_dev":true,"ocr_enabled":true}
```

Upload smoke:

```text
$ curl -s -X POST -F "file=@/tmp/test-doc.png" http://localhost:8000/api/v4/documents/
{"id":"6a12f76f-9fb4-4f96-8111-40f337cf509e", "status":"pending", ...}
```

Result smoke:

```text
$ curl -s http://localhost:8000/api/v4/documents/6a12f76f-.../result
{"job_id":"6a12f76f-...", "status":"completed", ...}
```

Backend `POST /documents/` → `GET /documents/{id}/result` chain is alive.

---

## G) Hook Integration Tests

```text
$ npx jest src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx --no-coverage
PASS src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx
  useAnalyzeSavedDocument
    ✓ uploads to the new core-api backend, not the legacy OCR MVP
    ✓ is not eligible when rohText already exists
```

---

## H) tsc / jest / diff-check

### TypeScript
```text
$ npx tsc --noEmit --skipLibCheck
(no output → success)
```

### Jest
```text
$ npx jest src/__tests__/buildAnalyzedDocumentUpdate.test.ts src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx --no-coverage
Test Suites: 2 passed, 2 total
Tests:       5 passed, 5 total
```

### Whitespace
```text
$ git diff --check
(no output → success)
```

---

## I) Legacy OCR MVP Detail Path Removed?

**Yes.**

Old chain (removed from Detail Analysieren):
```
useAnalyzeSavedDocument → useOcrMvpJob → POST ${OCR_MVP_BASE}/documents/analyze
```

New chain:
```
useAnalyzeSavedDocument → enqueueV4Upload → POST ${API_BASE}/documents/
                        → attachV4JobPolling → GET ${API_BASE}/documents/{id}
                                               → GET ${API_BASE}/documents/{id}/result
```

`rg` confirmed that the Detail path no longer calls `useOcrMvpJob` or `POST /documents/analyze`. Remaining `useOcrMvpJob` references are in `OcrMvpScreen` and type-only imports.

---

## J) Protected Fields Preserved?

**Yes.**

Approach A keeps the existing `buildResultUpdate` contract in `src/services/v4DocumentJobPoll.ts`.

**Written by backend result:** `rohText`, `confidence`, `detectedLanguage`, `ocrJobId`, `aiDisplayTitle`, `aiDocumentType`, `aiSender`, `aiLabelledAt`.

**Never written:** `titel`, `typ`, `absender`, `customTitle`, `userOrdner`, `frist`, `betrag`, `zusammenfassung`, `kurzfassung`, `iban`.

---

## K) Package / Native / Config Untouched?

- `package.json` — unchanged
- `app.json` / `eas.json` — unchanged
- Native iOS/Android project files — unchanged
- `src/config.ts` — unchanged

---

## L) Backend Source Untouched?

- No `.py` files changed.
- No Alembic migrations added.
- No backend schema changes.
- Only `backend/**/__pycache__` was touched during local smoke; restored before commit.

---

## M) Dockerfile Untouched?

- No `Dockerfile*` changes.

---

## N) Stash Count

```text
$ git stash list | wc -l
6
```

6 pre-existing stashes; none belong to this PR.

---

## O) Auditor Verdict

| Criterion | Status |
|-----------|--------|
| Legacy MVP removed from Detail Analysieren | ✅ PASS |
| New backend upload/result chain wired | ✅ PASS |
| Protected fields preserved | ✅ PASS |
| TypeScript compiles | ✅ PASS |
| Unit/integration tests pass | ✅ PASS |
| No whitespace errors | ✅ PASS |
| Backend contract smoke (curl) | ✅ PASS |
| Backend source untouched | ✅ PASS |
| Package/native/config untouched | ✅ PASS |
| Dockerfile untouched | ✅ PASS |
| Runtime manual UI smoke | ⚠️ NOT EXECUTED (CLI environment; deferred to real device) |

**Overall:** ✅ **PASS**

**Commit:** GO  
**PR:** GO  
**Merge:** HOLD until PR review is complete.
