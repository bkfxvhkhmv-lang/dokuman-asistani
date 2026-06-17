# Upload / Scan / Analysieren OCR Chain Audit

**Date:** 2026-06-17  
**Scope:** `briefpilot-clean` (backend + app), read-only  
**Trusted backend main:** `17475277a`  
**Goal:** Verify whether user-facing upload/scan/analyse flows actually use the new `briefpilot-clean/backend` OCR stack (`POST /documents/` → PaddleOCR / text-layer fast path → `GET /documents/{id}/result`).

---

## Executive Summary

**The new core-api OCR pipeline is implemented on the backend, but the app only uses it as a fire-and-forget enrichment for scans.**

The user-facing paths that matter most are still routed through the **legacy OCR MVP backend** or through the **local Google Vision + SmartAutoFill pipeline**:

| Flow | Primary OCR / AI | Backend `GET /documents/{id}/result` used? | Notes |
|------|------------------|--------------------------------------------|-------|
| **Camera scan → “Weiter”** | Google Vision API + local `analysiereText` / SmartAutoFill | No (uploads image *after* local analysis) | `enqueueV4Upload` runs only for backend enrichment |
| **Onboarding / Share PDF import** | Local Vision / heuristics; PDF text ignored | No | `processSharedFile` never calls `enqueueV4Upload` |
| **Detail “Analysieren” button** | **Legacy OCR MVP** `POST /documents/analyze` | No | Polls `/documents/{job_id}/result` on the **old** MVP base |
| **Detail “Besser erkennen” / AI Labeler** | **Legacy OCR MVP** `POST /ai/label` | No | Calls `labelDocumentViaOcrMvp` |
| **Detail “Pipeline-Analyse wiederholen”** | Core-api `POST /documents/` | Yes | Only path that intentionally retries the new backend |
| **Backend `POST /documents/` upload** | PaddleOCR / PDF text-layer fast path | Yes (produces the result) | Correct, but app does not rely on it |

**Critical finding:** The “Analysieren” button on the detail screen — the main CTA for saved documents — still talks to the old OCR MVP backend. It does **not** use `briefpilot-clean/backend`.

---

## 1. Backend OCR pipeline (the intended path)

### 1.1 Upload endpoint

`backend/app/api/documents.py`

- `POST /documents/` (mounted at `/api/v4/documents/` and legacy `/documents/`).
- Stores file in MinIO, creates `Document` row with `status=pending`.
- If `OCR_ENABLED=true`:
  - Development + `PROCESS_OCR_INLINE_DEV=true`: runs `execute_ocr_job` in a subprocess synchronously.
  - Otherwise: enqueues Celery `process_ocr`.
- Returns `DocumentOut` with `id`, `status`, `checksum`, `version`.

### 1.2 OCR worker

`backend/app/services/ocr.py` + `backend/app/workers/ocr_worker.py`

- `run_ocr()` tries a **PDF text-layer fast path** first (#137):
  - `_extract_pdf_text_layer()` via PyMuPDF.
  - If text ≥ 50 chars or ≥ 5 tokens, returns it with `confidence=1.0` and skips PaddleOCR.
- Fallback: rasterize PDF / open image → `_limit_max_side()` → PaddleOCR `ocr()`.
- Supports PP-OCRv5 dict output (`rec_texts`, `rec_scores`, `dt_polys`) and legacy list output.
- `execute_ocr_job()` writes `document_texts.roh_text`, `confidence`, `lang` and sets `documents.status='completed'`.
- Then chains `process_decision` (LLM → meta) and `process_summary` (embedding).

### 1.3 Result endpoint

`backend/app/api/documents.py` → `GET /documents/{doc_id}/result`

- Returns `BackendWorkerResult` schema (`backend/app/schemas/worker_result.py`).
- Fields: `job_id`, `status`, `confidence`, `language`, `document.*`, `action_summary.*`, `meta.*`, `error`.
- Currently `document.sender` is **always `None`** — `summary_worker`/`decision_worker` do not populate a sender.
- Tests: `backend/tests/test_worker_result.py` confirm the contract.

### 1.4 AI explain / chat

`backend/app/api/analysis.py`

- `POST /ai/explain/{doc_id}` and `POST /ai/chat/{doc_id}` use the cached `doc.text.roh_text` and `doc.meta`.
- There is **no** `/ai/label` endpoint in the new backend.

---

## 2. App configuration — two backends exist

`src/config.ts`

```ts
export const API_BASE: string = cfg.API_BASE;       // new core-api, e.g. …/api/v4
export const OCR_MVP_BASE: string = cfg.OCR_MVP_BASE; // legacy OCR MVP
```

- Dev defaults auto-detect Expo host and set both to the same `:8000`.
- Production defaults separate them:
  - `API_BASE = https://api.briefpilot.de/api/v4`
  - `OCR_MVP_BASE = https://api.briefpilot.app`

This means in production the app currently talks to **two different backends**.

---

## 3. Flow-by-flow audit

### 3.1 Camera scan → save

**Files:**
- `src/features/scan/kamera-screen/KameraScreenView.tsx`
- `src/hooks/useOcr.ts`
- `src/core/ocr/OcrManager.ts`
- `src/hooks/useDocumentPipeline.ts` / `src/hooks/useSmartDocumentPipeline.ts`
- `src/services/v4EnqueueUpload.ts`

**Trace:**

1. `KameraScreenView` uses `useOcr()` → `OcrManager`.
2. `OcrManager` priority:
   1. Google Vision API (`vision_api`) — primary.
   2. `POST ${backendEndpoint}/ocr` — but **the new backend has no `/ocr` endpoint** (verified in `backend/app/main.py`).
   3. Local stub.
3. `useProcessingHandler` calls `recognizeCaptures`, then either:
   - `useDocumentPipeline.finalizeDocument()` → local `analysiereText` + core classifier + SmartAutoFill.
   - `useSmartDocumentPipeline.analyzeAndReview()` → same local stack + review modal.
4. After the document is fully created locally, only then:
   ```ts
   if (leadPage?.uri) {
     enqueueV4Upload(dispatch, documentId, leadPage.uri, `${documentId}.jpg`);
   }
   ```
5. `enqueueV4Upload` uploads to `POST /documents/` and polls `GET /documents/{id}/result`.
6. `v4DocumentJobPoll.buildResultUpdate()` writes **only** `confidence`, `detectedLanguage`, `ocrJobId`, `rohText`, `aiDisplayTitle`, `aiDocumentType`, `aiSender`, `aiLabelledAt`.
   - It **never** overwrites `titel`, `typ`, `absender`, `customTitle`, `userOrdner`.

**Verdict:** The new backend is used only as a non-blocking enrichment. The user-facing document is built from local Vision OCR + heuristics. The PDF text-layer fast path in the backend is **not** exploited by scans.

### 3.2 Onboarding PDF import / system share

**Files:**
- `src/features/onboarding/OnboardingScreen.tsx`
- `src/services/ShareUploadService.ts`

**Trace:**

1. `OnboardingScreen.openFilePicker` calls `processSharedFile(uri, state.dokumente)`.
2. `processSharedFile`:
   - For images: Vision OCR via `extractTextFromImage`.
   - For PDFs: sets `rawText = ''` (no backend OCR, no text extraction).
   - Runs `analysiereText` / `runSmartAutoFill` / `runSmartCategorization`.
   - Creates the `Dokument` locally.
   - **No `enqueueV4Upload` call.**

**Verdict:** Onboarding / share imports do **not** touch the new backend OCR at all. Imported PDFs will have empty `rohText` and generic metadata.

### 3.3 Detail “Analysieren” button (saved documents)

**Files:**
- `src/features/detail/detail-screen/useDetailBildschirmLogic.ts`
- `src/features/detail/hooks/useAnalyzeSavedDocument.ts`
- `src/hooks/useOcrMvpJob.ts`
- `src/services/ocrMvpApi.ts`
- `src/features/ocr-mvp/adapters/ocrMvpToV4Document.ts`
- `src/features/detail/hooks/buildAnalyzedDocumentUpdate.ts`

**Trace:**

1. `useAnalyzeSavedDocument` calls `useOcrMvpJob()`.
2. `startAnalyze` → `buildAnalyseFileFromDocument` → `startJob`.
3. `useOcrMvpJob.startJob`:
   ```ts
   const { job_id } = await analyzeDocument(file, forceType, abortCtrl.signal, meta);
   ```
4. `analyzeDocument` in `src/services/ocrMvpApi.ts`:
   ```ts
   const res = await fetch(`${getCachedOcrBase()}/documents/analyze`, ...)
   ```
   `getCachedOcrBase()` returns `OCR_MVP_BASE`.
5. Polling calls `getOcrResult(jobId)`:
   ```ts
   const res = await fetch(`${getCachedOcrBase()}/documents/${jobId}/result`, ...)
   ```
6. On `status='done'`:
   - `ocrMvpToV4Document(result, ...)` builds a full `Dokument` including **new** `titel`, `typ`, `absender`, `zusammenfassung`, `frist`, `betrag`, etc.
   - `buildAnalyzedDocumentUpdate(existing, draft)` preserves `customTitle` and `userOrdner`, but spreads `...draft` first, so `titel`, `typ`, `absender` are **overwritten** by the MVP result.

**Verdict:** This is the **legacy OCR MVP path**. It does not use `briefpilot-clean/backend`.

### 3.4 AI Labeler (“Besser erkennen”)

**Files:**
- `src/services/AiLabelerService.ts`
- `src/hooks/useAiLabeler.ts` (caller)

**Trace:**

```ts
raw = await labelDocumentViaOcrMvp({ rohText, currentTitle, currentType, currentSender });
```

`labelDocumentViaOcrMvp` posts to `POST ${getCachedOcrBase()}/ai/label`.

**Verdict:** AI labeling also calls the **legacy OCR MVP backend**, not the new core-api `/result` endpoint.

### 3.5 Detail “Pipeline-Analyse wiederholen”

**File:** `src/features/detail/DetailScreen.tsx`

```ts
const onRetryPipelineAnalysis = useCallback(() => {
  const uri = dok.pages?.[0]?.uri;
  if (!uri) return;
  enqueueV4Upload(dispatch, dok.id, uri, `${dok.id}.jpg`);
}, [dispatch, dok.id, dok.pages]);
```

This is the only user-facing flow that intentionally retries the new backend.

---

## 4. Protected-field policy

`src/services/v4DocumentJobPoll.ts` → `buildResultUpdate`

**Writes:** `confidence`, `detectedLanguage`, `ocrJobId`, `rohText`, `aiDisplayTitle`, `aiDocumentType`, `aiSender`, `aiLabelledAt`.

**Never writes:** `customTitle`, `titel`, `typ`, `absender`, `frist`, `betrag`, `zusammenfassung`, `kurzfassung`, `iban`.

This policy is correct and safe for the new backend result path. However, it is **not** respected by the legacy MVP path:

- `ocrMvpToV4Document` generates its own `titel`, `typ`, `absender`.
- `buildAnalyzedDocumentUpdate` spreads the draft over the existing document, overwriting those fields.
- Only `customTitle` and `userOrdner` survive.

So a user who edits `titel`/`typ`/`absender` and then taps **“Analysieren”** will lose those edits.

---

## 5. Gaps and risks

1. **“Analysieren” uses the old backend.**
   - In production this hits a different host (`api.briefpilot.app`) than the new core API.
   - It bypasses the PaddleOCR / PDF text-layer work done in `briefpilot-clean/backend`.

2. **Scan pipeline never benefits from backend PDF text-layer fast path.**
   - Scans are images, so text-layer is irrelevant, but uploaded PDFs from camera batch → save could be routed through backend earlier.

3. **Share / Onboarding PDF import has no backend OCR fallback.**
   - Imported PDFs start with empty `rohText`.
   - The detail “Analysieren” button will later send them to the **legacy** MVP, not the new backend.

4. **Backend `/result` does not return `sender`.**
   - `WorkerResultDocument.sender` is hard-coded to `None` in `_worker_result_out`.
   - App’s `buildResultUpdate` can map `aiSender` only if the backend ever provides it.

5. **`OcrManager.tryBackend` calls `/ocr`, which does not exist in the new backend.**
   - This fallback is dead code when using `briefpilot-clean/backend`.

6. **Duplicate classification stacks.**
   - Local Vision + SmartAutoFill.
   - Legacy OCR MVP.
   - New core-api Paddle/LLM workers.
   - Maintenance cost and inconsistent user experience.

---

## 6. Recommendations

1. **Migrate “Analysieren” to the new backend.**
   - Replace `useOcrMvpJob` with `enqueueV4Upload` + `attachV4JobPolling` in `useAnalyzeSavedDocument`.
   - Ensure the existing document file is uploaded to `POST /documents/`.
   - Decide whether the legacy MVP adapter `ocrMvpToV4Document` should still be used to enrich fields that the new backend does not yet return (e.g. sender).

2. **Populate `sender` in the new backend.**
   - Either extend `decision_worker._llm_explain` to extract sender, or add a dedicated extraction step.
   - Update `_worker_result_out` to return `document.sender`.

3. **Route Onboarding / Share PDF imports through the new backend.**
   - Add `enqueueV4Upload` in `processSharedFile` for images and PDFs.
   - Until backend enrichment completes, show a “Wird analysiert…” optimistic card.

4. **Decide the fate of `OcrManager.tryBackend(/ocr)`.**
   - Either add a core-api `/ocr` sync endpoint or remove the fallback.

5. **Unify AI Labeler.**
   - Replace `POST /ai/label` on the legacy MVP with the new backend’s explain/chat pipeline, or call the new backend’s `/result` endpoint and surface `aiDisplayTitle` / `aiDocumentType` / `aiSender`.

6. **Document and enforce the protected-field policy across all paths.**
   - The legacy MVP path currently violates it for `titel`/`typ`/`absender`.

---

## 7. Appendix — key file map

| File | Role |
|------|------|
| `backend/app/api/documents.py` | Core upload + `/result` endpoints |
| `backend/app/services/ocr.py` | PaddleOCR + PDF text-layer fast path |
| `backend/app/workers/ocr_worker.py` | OCR job worker |
| `backend/app/workers/decision_worker.py` | LLM meta extraction |
| `backend/app/schemas/worker_result.py` | `/result` contract |
| `src/services/v4EnqueueUpload.ts` | New backend upload starter |
| `src/services/v4DocumentJobPoll.ts` | Polls `/result` and maps to store safely |
| `src/hooks/useAnalyzeSavedDocument.ts` | **Legacy MVP Analysieren flow** |
| `src/hooks/useOcrMvpJob.ts` | Polls legacy MVP `/documents/analyze` |
| `src/services/ocrMvpApi.ts` | Legacy MVP API client (`/documents/analyze`, `/ai/label`) |
| `src/features/ocr-mvp/adapters/ocrMvpToV4Document.ts` | Maps MVP result to store, overwrites identity fields |
| `src/hooks/useDocumentPipeline.ts` | Local Vision + SmartAutoFill + fire-and-forget backend upload |
| `src/hooks/useSmartDocumentPipeline.ts` | Same, with review modal |
| `src/services/ShareUploadService.ts` | Share/Onboarding import, no backend upload |
| `src/services/AiLabelerService.ts` | Legacy `/ai/label` caller |
| `src/core/ocr/OcrManager.ts` | Vision API primary, dead `/ocr` backend fallback |
| `src/config.ts` | Two-base config (`API_BASE`, `OCR_MVP_BASE`) |

---

**Audit conclusion:** The new backend OCR pipeline is production-ready on the server side, but the app’s primary user flows are not using it. The most urgent fix is migrating the **Detail “Analysieren”** CTA and the **AI Labeler** from the legacy OCR MVP to the new `briefpilot-clean/backend` stack.
