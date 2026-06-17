# #138 Analysieren Migration — Final Pre-Commit Report

**Date:** 2026-06-17  
**Branch:** `main`  
**HEAD:** `17475277a99b2f9372ab30fcb76eee3de30f7fbf`  
**Scope:** Migrate Detail-screen “Analysieren” from legacy OCR MVP to new core-api backend (Approach A).

---

## A) Branch / HEAD

- Branch: `main`
- HEAD: `17475277a99b2f9372ab30fcb76eee3de30f7fbf`
- No new branch created for this change yet.

---

## B) Changed Files

### Source code (intentional)
| File | Lines | What changed |
|------|-------|--------------|
| `src/services/v4EnqueueUpload.ts` | +10 / -2 | Added `EnqueueV4UploadOptions` with `suppressAlert`; callers can suppress the default retry Alert. |
| `src/features/detail/hooks/useAnalyzeSavedDocument.ts` | +66 / -44 | Replaced legacy `useOcrMvpJob` + `ocrMvpToV4Document` + `buildAnalyzedDocumentUpdate` with `enqueueV4Upload` + `v4JobStatus` mapping. |
| `src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx` | New | Integration test proving the hook calls `enqueueV4Upload` and never calls legacy `useOcrMvpJob`. |

### Documentation (intentional)
| File | Status | What changed |
|------|--------|--------------|
| `docs/reports/REPORT_INDEX.md` | Modified | Added link to the audit report and this migration report. |
| `docs/audits/2026-06-17_upload-scan-analyze-chain-audit.md` | Untracked | Read-only audit that triggered this migration. |

### Noise (must NOT be committed)
- `backend/**/__pycache__/*.pyc` files are shown as modified by `git status` after running backend smoke.
- These are runtime artifacts from local Python execution; no `.py` source file was changed.
- **Action before commit:** `git restore backend` or add `__pycache__` to `.gitignore` if missing.

Current `git status --short` after `git restore backend`:

```text
 M docs/reports/REPORT_INDEX.md
 M src/features/detail/hooks/useAnalyzeSavedDocument.ts
 M src/services/v4EnqueueUpload.ts
?? docs/audits/2026-06-17_138-analysieren-migration-final-report.md
?? docs/audits/2026-06-17_upload-scan-analyze-chain-audit.md
?? src/features/detail/hooks/__tests__/
```

```text
$ git diff --name-only -- '*.py' 'package.json' 'Dockerfile*' 'app.json' 'eas.json'
(no output)
```

---

## C) Legacy MVP Detail Flow Removed?

**Yes, from the Detail “Analysieren” path.**

Old chain:
```
useAnalyzeSavedDocument
  → useOcrMvpJob
    → analyzeDocument (src/services/ocrMvpApi.ts)
      → POST ${OCR_MVP_BASE}/documents/analyze
    → getOcrResult
      → GET ${OCR_MVP_BASE}/documents/{job_id}/result
  → ocrMvpToV4Document
  → buildAnalyzedDocumentUpdate
```

New chain:
```
useAnalyzeSavedDocument
  → buildAnalyseFileFromDocument
  → enqueueV4Upload
    → POST ${API_BASE}/documents/
    → attachV4JobPolling
      → GET ${API_BASE}/documents/{id}
      → GET ${API_BASE}/documents/{id}/result
  → v4DocumentJobPoll.buildResultUpdate
```

The imports `useOcrMvpJob`, `ocrMvpToV4Document`, and `buildAnalyzedDocumentUpdate` were removed from `useAnalyzeSavedDocument.ts`.

---

## D) New Backend Upload/Result Chain

1. `buildAnalyseFileFromDocument(dok)` resolves a valid file URI + name from `dok.uri`, `dok.dateiName`, or first page.
2. `enqueueV4Upload(dispatch, dok.id, file.uri, file.name, { suppressAlert: true })`:
   - Dispatches `v4JobStatus: 'pending'`.
   - Uploads to `POST /documents/` via `uploadDocumentV4Safe` (authFetch, retry).
   - Receives remote `id` and stores it in `v4DocId`.
   - Starts `attachV4JobPolling`.
3. Polling:
   - `GET /documents/{id}` → normalizes status → dispatches `v4JobStatus`.
   - On `completed` → `GET /documents/{id}/result`.
4. `buildResultUpdate` writes only safe fields:
   - `confidence`, `detectedLanguage`, `ocrJobId`, `rohText`
   - `aiDisplayTitle`, `aiDocumentType`, `aiSender`, `aiLabelledAt`
   - **Never** writes `titel`, `typ`, `absender`, `customTitle`, `userOrdner`, etc.

---

## E) Protected Fields Preserved?

**Yes.**

Approach A deliberately keeps the existing `buildResultUpdate` contract. The legacy `ocrMvpToV4Document` + `buildAnalyzedDocumentUpdate` pair was overwriting `titel`, `typ`, and `absender`. That path is now gone from the Detail Analysieren flow.

`customTitle` and `userOrdner` are also untouched because `buildResultUpdate` never writes them.

---

## F) Tests / Type-Check Results

### TypeScript
```text
$ npx tsc --noEmit --skipLibCheck
(no output → success)
```

### Jest
```text
$ npx jest src/__tests__/buildAnalyzedDocumentUpdate.test.ts --no-coverage
PASS src/__tests__/buildAnalyzedDocumentUpdate.test.ts
  buildAnalyzedDocumentUpdate
    ✓ keeps the existing document id and file identity (1 ms)
    ✓ applies OCR-derived fields from the draft
    ✓ preserves user edits and document state (1 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### New hook integration test
```text
$ npx jest src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx --no-coverage
PASS src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx
  useAnalyzeSavedDocument
    ✓ uploads to the new core-api backend, not the legacy OCR MVP (8 ms)
    ✓ is not eligible when rohText already exists (1 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

### Whitespace check
```text
$ git diff --check
(no output → no whitespace errors)
```

---

## G) Manual Smoke / Network Trace

### Backend contract smoke (curl)

Local backend stack is running on `localhost:8000`.

```text
$ curl -s http://localhost:8000/api/v4/health/
{"status":"ok", ... "process_ocr_inline_dev":true,"ocr_enabled":true}
```

Upload smoke:

```text
$ curl -s -X POST -F "file=@/tmp/test-doc.png" http://localhost:8000/api/v4/documents/
{"id":"6a12f76f-9fb4-4f96-8111-40f337cf509e", "status":"pending", ...}
```

Result smoke (after ~3s):

```text
$ curl -s http://localhost:8000/api/v4/documents/6a12f76f-.../result
{"job_id":"6a12f76f-...","status":"completed", ...}
```

This confirms the backend `POST /documents/` → `GET /documents/{id}/result` contract is alive and reachable from the local dev environment.

### App-level smoke

A headless UI tap is not possible in this CLI environment, so a runtime manual tap on a device/emulator was **not executed**. As a substitute, a hook-level integration test was added:

```text
PASS src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx
  useAnalyzeSavedDocument
    ✓ uploads to the new core-api backend, not the legacy OCR MVP
    ✓ is not eligible when rohText already exists
```

The test proves that tapping “Analysieren” would call `enqueueV4Upload(dispatch, docId, fileUri, fileName, { suppressAlert: true })` and would **not** call `useOcrMvpJob` / `POST /documents/analyze`.

### Static trace evidence

| Step | Expected network call | Evidence in code |
|------|----------------------|------------------|
| Tap “Analysieren” | `POST ${API_BASE}/documents/` | `enqueueV4Upload` → `uploadDocumentV4Safe` |
| Upload success | `GET ${API_BASE}/documents/{id}` | `attachV4JobPolling` → `getDocumentV4` |
| Status completed | `GET ${API_BASE}/documents/{id}/result` | `attachV4JobPolling` → `getDocumentWorkerResult` |
| Store update | `UPDATE_DOKUMENT` with safe fields | `buildResultUpdate` in `src/services/v4DocumentJobPoll.ts` |

The old `POST ${OCR_MVP_BASE}/documents/analyze` call is no longer reachable from `useAnalyzeSavedDocument`.

**Recommended manual smoke before release:**
1. Open a saved document with no `rohText`.
2. Tap “Analysieren”.
3. Observe network tab:
   - Must see `POST /api/v4/documents/`
   - Must see polling `GET /api/v4/documents/{id}`
   - Must see `GET /api/v4/documents/{id}/result`
   - Must **not** see `POST /documents/analyze`.
4. After completion:
   - `rohText`, `confidence`, `ocrJobId`, `v4JobStatus=completed` populated.
   - `titel`, `typ`, `absender` unchanged.

---

## H) `rg` Legacy Remnant Search

```text
$ rg "useOcrMvpJob|ocrMvpToV4Document|buildAnalyzedDocumentUpdate|documents/analyze|OCR_MVP_BASE" src/features/detail src/hooks src/services
```

Output:

```text
src/hooks/useOcrMvpJob.ts:export function useOcrMvpJob(): UseOcrMvpJobReturn {
src/features/detail/utils/toUserFacingAnalyseErrorMessage.ts:import type { OcrMvpStatus } from '@/hooks/useOcrMvpJob';
src/services/export/steuerberaterZip.ts:import { OCR_MVP_BASE } from '@/config';
src/services/export/steuerberaterZip.ts:  const url = `${OCR_MVP_BASE}/steuerberpaket?year=${year}`;
src/features/detail/utils/isUnanalysedQuickSaved.ts:import type { OcrMvpStatus } from '@/hooks/useOcrMvpJob';
src/features/detail/hooks/useAnalyzeSavedDocument.ts:import type { OcrMvpStatus, OcrMvpErrorKind } from '@/hooks/useOcrMvpJob';
src/features/detail/hooks/buildAnalyzedDocumentUpdate.ts:export function buildAnalyzedDocumentUpdate(
src/services/ocrMvpApi.ts:// POST /documents/analyze
src/services/ocrMvpApi.ts:  const res = await fetch(`${getCachedOcrBase()}/documents/analyze`, {
```

### Interpretation
- `useOcrMvpJob.ts` — still exported because `OcrMvpScreen` uses it.
- `toUserFacingAnalyseErrorMessage.ts` / `isUnanalysedQuickSaved.ts` — only import the **type** `OcrMvpStatus`; no runtime MVP dependency.
- `useAnalyzeSavedDocument.ts` — only imports the **type** `OcrMvpStatus`/`OcrMvpErrorKind`; runtime legacy hooks removed.
- `buildAnalyzedDocumentUpdate.ts` — still exists but is no longer imported by `useAnalyzeSavedDocument`; it is used by tests and possibly `OcrMvpScreen`.
- `ocrMvpApi.ts` — still contains `/documents/analyze` because `OcrMvpScreen` and AI Labeler (#139) still use it.
- `steuerberaterZip.ts` — unrelated tax-export feature still points to `OCR_MVP_BASE`.

**Conclusion:** The Detail Analysieren path no longer contains runtime legacy MVP calls. Remaining references are either type-only or belong to other screens/flows.

---

## I) App / Package / Native / Config Untouched?

- `package.json` — unchanged
- `app.json` / `eas.json` — unchanged
- Native iOS/Android project files — unchanged
- `src/config.ts` — unchanged (both `API_BASE` and `OCR_MVP_BASE` still exist)

---

## J) Backend Untouched?

- No `.py` file changed.
- No Alembic migration added.
- No backend schema change.
- `__pycache__` modifications are runtime noise only.

---

## K) Dockerfile Untouched?

- No `Dockerfile*` changes.

---

## L) Stash Count

```text
$ git stash list
stash@{0}: On fix/127a-actionable-brief-summary: RESTORED (accidentally popped): WIP detail/analysis changes + audit doc
stash@{1}: On P0-remaining-display-technical-text-cleanup: WIP: out-of-scope P0 polish (RiskPanel, auto-fill confidence, sender profile, smart summary)
stash@{2}: On main: HOLD Home FlatList chain - rejected UX, before Strangler Fig plan
stash@{3}: On P1-performance-detail-viewer-virtualization: DocumentPagesViewer verify windowing (uncommitted follow-up)
stash@{4}: On main: HomeRecentList memo/stagger changes (HOLD)
stash@{5}: On main: wip sender extraction before ios smoke
```

6 stashes exist. None are directly related to this change, but they indicate other WIP work in the working tree.

---

## M) Auditor Verdict

| Criterion | Status |
|-----------|--------|
| Legacy MVP removed from Detail Analysieren | ✅ PASS |
| New backend upload/result chain wired | ✅ PASS |
| Protected fields preserved (Approach A) | ✅ PASS |
| TypeScript compiles | ✅ PASS |
| Relevant unit tests pass | ✅ PASS |
| No whitespace errors | ✅ PASS |
| No backend / package / Dockerfile changes | ✅ PASS |
| Backend contract smoke (curl) | ✅ PASS |
| Hook integration test | ✅ PASS |
| Runtime manual UI smoke (device tap) | ⚠️ NOT EXECUTED (CLI environment) |
| Pre-commit cleanup needed | ✅ DONE (`git restore backend`) |

**Overall:** **PASS with HOLD on commit until `__pycache__` noise is cleaned and a manual network smoke is performed.**

---

## Recommended Commit Command (after cleanup)

```bash
# Remove runtime artifacts (already done)
git restore backend

# Stage only the intentional changes
git add src/services/v4EnqueueUpload.ts \
        src/features/detail/hooks/useAnalyzeSavedDocument.ts \
        src/features/detail/hooks/__tests__/useAnalyzeSavedDocument.test.tsx \
        docs/reports/REPORT_INDEX.md \
        docs/audits/2026-06-17_upload-scan-analyze-chain-audit.md \
        docs/audits/2026-06-17_138-analysieren-migration-final-report.md

# Commit
git commit -m "feat(detail): migrate Analysieren to core-api backend

- Replace legacy OCR MVP POST /documents/analyze with new backend
  POST /documents/ + GET /documents/{id}/result polling.
- Keep protected-field policy: titel/typ/absender/customTitle/userOrdner
  are never overwritten.
- Add suppressAlert option to enqueueV4Upload so the hook can own
  its own error UX.
- Add integration test verifying the new upload path.

Refs #138"
```

---

## Next Steps (after #138)

1. **Manual smoke** on device/emulator to confirm network calls.
2. **#139 AI Labeler migration** (`/ai/label` → backend `/result` or explain).
3. **#140 Scan / Share / Onboarding import migration** to use backend OCR as primary instead of fire-and-forget enrichment.
4. **#141 Worker warm-engine performance** optimization.
