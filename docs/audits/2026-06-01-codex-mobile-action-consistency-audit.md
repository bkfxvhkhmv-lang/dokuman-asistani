# Mobile Action Consistency Audit

## Report Metadata
- Author/Agent: Codex
- Role: mobile code/action consistency audit
- Date: 2026-06-01
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: 54e5d480e, 604f59791, 1f8d2b28d
- Task type: audit / validation / docs
- Scope: code health, saved document actions, export/reply/share flows
- Status: FOLLOW-UP REQUIRED

## 1. Scope
- Feature area: mobile action consistency before Android work.
- Audited action surfaces:
  1. OCR result screen
  2. Saved document Detail screen
  3. Inline Erledigen / old more-menu remnants
  4. ExportierenSheet
  5. Antwort schreiben flow
  6. Besser erkennen flow
  7. Steuerberater export touchpoints
  8. PDF signing flow
  9. Delete flow
  10. Share/copy flows
  11. AppSheet/modal layout risk
  12. OCR job polling / timeout behavior
- Inspected folders/files:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/hooks/`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/store/`
- This report intentionally does not focus on translations/localization.

## 2. Search Commands Used
- `git -C /Users/bayramgul/bp_canavar_v6_refactor branch --show-current`
- `git -C /Users/bayramgul/bp_canavar_v6_refactor rev-parse --short HEAD`
- `git -C /Users/bayramgul/bp_canavar_v6_refactor log --oneline -5`
- `git -C /Users/bayramgul/bp_canavar_v6_refactor status --short`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npx tsc --noEmit`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npm test -- --runInBand src/__tests__/documentActionFlows.test.ts src/__tests__/aiLabeler.test.ts`
- `rg -n "TemplateLibrary|ToneAdjuster|chatWithDocument|reply_draft|Draft|Vorlage|downloadOcrResult|ExportierenSheet|Antwort schreiben|yanitSablon|reply|ocrJobId|v4DocId" /Users/bayramgul/bp_canavar_v6_refactor/src`
- `rg -n "EXPO_PUBLIC_VISION_API_KEY|OPENAI|ANTHROPIC|GEMINI|CLAUDE|api key|chatWithDocument\(" /Users/bayramgul/bp_canavar_v6_refactor/src`
- `rg -n "BelgeChatModal|HilfeModal|ai_chat|yanitSablon|TemplateLibrary|ToneAdjuster|create_reply_draft|reply_draft" /Users/bayramgul/bp_canavar_v6_refactor/src`
- sqlite check for latest OCR jobs:
  - `python3 ... select job_id,status,ocr_provider,error,created_at,started_processing_at,finished_at,duration_ms from jobs order by created_at desc limit 10`
- File inspections with `sed` for:
  - `src/features/ocr-mvp/components/OcrMvpResultCard.tsx`
  - `src/features/ocr-mvp/components/OcrMvpActionSummary.tsx`
  - `src/features/detail/hooks/useDetailMoreItems.ts`
  - `src/features/detail/DetailModalsContainer.tsx`
  - `src/features/detail/hooks/useDocumentActions.ts`
  - `src/features/detail/hooks/document-actions/sharing.ts`
  - `src/features/detail/hooks/document-actions/editFlow.ts`
  - `src/features/detail/services/finanzamtAnalysis.ts`
  - `src/design/components/AppSheet.tsx`
  - `src/features/detail/detail-modals/OptionsSheet.tsx`
  - `src/features/detail/detail-modals/PaymentPrepareSheet.tsx`
  - `src/features/detail/detail-modals/EinspruchSheet.tsx`
  - `src/store/reducers/documents.ts`
  - `src/features/ocr-mvp/OcrMvpScreen.tsx`

## 3. Files Touched
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-01-codex-mobile-action-consistency-audit.md`
  - reason: complete and update the audit with final findings
  - type of change: docs

## 4. Findings

### OCR Result Screen

#### Finding OCR-1 — OCR result reply action is inconsistent with saved-document reply flow
- Status: SHOULD FIX
- Severity: SHOULD FIX
- Where it appears:
  - OCR result screen via `OcrMvpActionSummary` when backend returns `create_reply_draft`
- Which documents:
  - backend-summary-driven docs only
- Required data fields:
  - `result.action_summary.recommended_actions`
- Missing-data behavior:
  - action is omitted if backend does not recommend it
- What happens now:
  - `create_reply_draft` maps to label `Entwurf anzeigen` and handler `preview`
  - it previews OCR output, not the saved-document `Antwort-Assistent`
- User impact:
  - reply action semantics differ between OCR result screen and saved Detail screen
- Technical root cause:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/components/OcrMvpActionSummary.tsx` maps reply draft to generic preview instead of reply flow
- Minimal solution:
  - either relabel this action as preview-only, or route it to the same saved-document reply assistant after save
- Risk level: medium

#### Finding OCR-2 — Excel export is consistent on OCR result screen
- Status: INTENTIONAL
- Severity: INTENTIONAL
- Where it appears:
  - OCR result screen
- Which documents:
  - OCR jobs with downloadable xlsx output
- Required data fields:
  - `result.job_id`, backend-generated output
- Missing-data behavior:
  - action cannot run without `job_id`
- What happens now:
  - `downloadOcrResult(result.job_id, filename)` then share
- User impact:
  - works as intended for OCR-result context
- Technical root cause:
  - result screen is job-centric; xlsx artifact belongs to the OCR job
- Minimal solution:
  - none
- Risk level: low

#### Finding OCR-3 — OCR timeout report from old ABBYY path is outdated
- Status: FIXED / REVALIDATED
- Severity: INTENTIONAL
- Where it appears:
  - OCR result / processing flow
- Which documents:
  - current scans through latest backend routing
- Required data fields:
  - latest jobs in sqlite audit table
- Missing-data behavior:
  - not applicable
- What happens now:
  - latest 10 jobs use `google_form_parser`
  - durations are ~4.9s to 8.0s
  - no current evidence that normal Google-path scans should hit the 30s frontend timeout
- User impact:
  - previous ABBYY-based timeout conclusion should not be used as current release truth
- Technical root cause:
  - backend routing changed after earlier audit; latest provider is now Google form parser
- Minimal solution:
  - keep timeout follow-up open only if a fresh current-path scan reproduces the issue
- Risk level: low
- Evidence:
  - latest jobs: `google_form_parser`, `duration_ms` 4994, 5501, 8040, 5329, 6237, 7918, 7859, 6961, 4935, 7452

### Saved Document Detail / Erledigen / More Actions

#### Finding DETAIL-1 — `Antwort schreiben` visibility was previously too broad; current state is narrowed
- Status: FIXED
- Severity: SHOULD FIX
- Where it appears:
  - saved document Detail → Erledigen inline actions
- Which documents:
  - currently Finanzamt-like docs only
- Required data fields:
  - `analyzeFinanzamt(dok).isFinanzamt`
- Missing-data behavior:
  - action is hidden
- What happens now:
  - current repo state after `604f59791` shows reply only for Finanzamt-like docs
- User impact:
  - avoids exposing a weak fallback on unrelated docs
- Technical root cause:
  - old visibility logic was broader than actual assistant scope
- Minimal solution:
  - keep current narrowed gate unless reply assistant scope expands
- Risk level: low
- Visibility control:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/useDetailMoreItems.ts`

#### Finding DETAIL-2 — `PDF unterschreiben` is no longer visible, but signing code remains mounted
- Status: FIXED / INTENTIONAL
- Severity: SHOULD FIX
- Where it appears:
  - was previously in saved document Detail → Erledigen inline actions
- Which documents:
  - formerly signable types (`Formular`, `Vertrag`, `Antrag`, `Behörden / Amt`)
- Required data fields:
  - visibility was type/action-based
- Missing-data behavior:
  - not applicable now because entry is hidden
- What happens now:
  - visible entry removed by `604f59791`
  - `SignaturePdfSheet` still exists and is mounted in `DetailModalsContainer`
- User impact:
  - current UI no longer exposes the unfinished signing flow
- Technical root cause:
  - underlying code intentionally kept for later polish
- Minimal solution:
  - keep hidden until rebuilt
- Risk level: low
- Visibility control file:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/useDetailMoreItems.ts`

#### Finding DETAIL-3 — Old more-menu sheet is no longer the primary surface, but modal chain still exists
- Status: INTENTIONAL
- Severity: LATER
- Where it appears:
  - saved document Detail modals container
- Which documents:
  - all, via modal infrastructure
- Required data fields:
  - modal state only
- Missing-data behavior:
  - not applicable
- What happens now:
  - inline Erledigen is the visible source of actions
  - old modal infrastructure still mounts multiple sheets/modals centrally
- User impact:
  - current product surface is cleaner, but dead/stale modal entry points remain possible if future UI wires them back
- Technical root cause:
  - central modal container retains old capabilities for compatibility
- Minimal solution:
  - separate dead-entry cleanup audit later
- Risk level: low

### ExportierenSheet / Share / Copy

#### Finding EXPORT-1 — Excel export is available in saved Detail only when `ocrJobId` exists
- Status: INTENTIONAL
- Severity: SHOULD FIX
- Where it appears:
  - saved document Detail → ExportierenSheet
- Which documents:
  - saved OCR-MVP-backed docs with `ocrJobId`
- Required data fields:
  - `dok.ocrJobId`
- Missing-data behavior:
  - Excel option is hidden entirely
- What happens now:
  - `DetailModalsContainer` passes `onExcel` only when `dok.ocrJobId` exists
- User impact:
  - export capability differs between OCR-result context and generic saved-doc context
- Technical root cause:
  - saved-detail Excel path reuses OCR job artifact download
- Minimal solution:
  - either document this as OCR-only, or add a generic spreadsheet export path for saved docs
- Risk level: medium

#### Finding EXPORT-2 — Original file sharing is consistent for local docs after recent export fix
- Status: FIXED
- Severity: SHOULD FIX
- Where it appears:
  - saved document Detail → ExportierenSheet → Originaldatei
- Which documents:
  - local docs without `v4DocId`
- Required data fields:
  - `dok.uri` or `dok.pages[0].uri`
- Missing-data behavior:
  - notice: original file not found
- What happens now:
  - local URI is shared directly; cloud file path only used when `v4DocId` exists
- User impact:
  - local saved docs no longer lose original-share capability
- Technical root cause:
  - fixed in `93de9c27b`
- Minimal solution:
  - none
- Risk level: low

#### Finding EXPORT-3 — Secure link is now hidden for local docs without `v4DocId`
- Status: FIXED
- Severity: SHOULD FIX
- Where it appears:
  - saved document Detail → ExportierenSheet
- Which documents:
  - cloud-synced docs only
- Required data fields:
  - `dok.v4DocId`
- Missing-data behavior:
  - option hidden
- What happens now:
  - local docs without server id no longer show `Sicherer Link`
- User impact:
  - avoids exposing an action that can only fail
- Technical root cause:
  - fixed in `54e5d480e`
- Minimal solution:
  - none
- Risk level: low

#### Finding EXPORT-4 — Copy/share surfaces are spread across multiple UI layers
- Status: INTENTIONAL
- Severity: LATER
- Where it appears:
  - `EinspruchSheet`, `YanıtSablonlariModal`, `ExportierenSheet`, generic share handlers
- Which documents:
  - depends on flow
- Required data fields:
  - varies by flow
- Missing-data behavior:
  - notices or hidden options
- What happens now:
  - copy/share behavior works but is fragmented across separate modal implementations
- User impact:
  - not a blocker, but makes long-term consistency harder
- Technical root cause:
  - actions evolved per feature rather than via one shared action presentation layer
- Minimal solution:
  - later consolidate copy/share button conventions, not routing
- Risk level: low

### Antwort schreiben Flow

#### Finding REPLY-1 — Current v1 is Finanzamt-only and deterministic
- Status: INTENTIONAL
- Severity: INTENTIONAL
- Where it appears:
  - saved document Detail via `yanitSablon`
- Which documents:
  - now only Finanzamt-like docs are visibly exposed
- Required data fields:
  - enough OCR text/fields for `analyzeFinanzamt(dok)`
- Missing-data behavior:
  - fallback notice inside modal if a non-Finanzamt doc still reaches it
- What happens now:
  - deterministic mode selection and draft generation
- User impact:
  - correct for current product decision
- Technical root cause:
  - v1 scope intentionally narrow
- Minimal solution:
  - none until a broader reply product scope is approved
- Risk level: low

### Besser erkennen / AI Labeler

#### Finding AI-1 — AI Labeler path is compile-safe and backend-routed
- Status: INTENTIONAL
- Severity: INTENTIONAL
- Where it appears:
  - saved document Detail → Angaben / Dokumentdaten area
- Which documents:
  - weak/generic docs only via `shouldLabel(dok)`
- Required data fields:
  - `rohText`, weak classification/sender/title, no prior `aiLabelledAt`
- Missing-data behavior:
  - card hidden
- What happens now:
  - manual trigger only, OCR-MVP backend path, user confirm before applying
- User impact:
  - consistent with recent AI Labeler decisions
- Technical root cause:
  - `AiLabelerService` uses `labelDocumentViaOcrMvp`, not direct provider calls or `chatWithDocument`
- Minimal solution:
  - none
- Risk level: low

### Steuerberater Export

#### Finding TAX-1 — No obvious code-side inconsistency found in this audit slice
- Status: INTENTIONAL
- Severity: INTENTIONAL
- Where it appears:
  - export area / dedicated export screen, not the saved-doc inline actions core
- Which documents:
  - tax-relevant docs based on export flow selection
- Required data fields:
  - export selection and relevant source docs
- Missing-data behavior:
  - export screen already shows explicit no-data alerts
- What happens now:
  - no broken references were found in this audit turn
- User impact:
  - no immediate blocker found
- Technical root cause:
  - not in active failure set for this audit
- Minimal solution:
  - none
- Risk level: low

### PDF Signing Flow

#### Finding SIGN-1 — Underlying signing implementation remains in code but should stay unexposed
- Status: INTENTIONAL
- Severity: LATER
- Where it appears:
  - `SignaturePdfSheet` still mounted in `DetailModalsContainer`
- Which documents:
  - only reachable if a future UI re-adds the entry or calls `modal.open('signatur')`
- Required data fields:
  - local/available PDF source and gesture interaction path
- Missing-data behavior:
  - flow handles export/source failures internally
- What happens now:
  - entry is hidden; code remains
- User impact:
  - no current visible risk, but code is not dead-clean
- Technical root cause:
  - hidden unfinished feature retained for future work
- Minimal solution:
  - keep hidden; do not re-expose without redesign
- Risk level: low

### Delete Flow / State Consistency

#### Finding DELETE-1 — Delete state path looks consistent
- Status: INTENTIONAL
- Severity: INTENTIONAL
- Where it appears:
  - saved document Detail delete flow
- Which documents:
  - all saved docs
- Required data fields:
  - `dokId`
- Missing-data behavior:
  - not applicable
- What happens now:
  - `DetailModalsContainer` opens delete modal, dispatches `DELETE_DOKUMENT`, closes modal, and routes back
  - reducer removes doc by id from `state.dokumente`
- User impact:
  - no obvious stale duplicate remains from code path inspection
- Technical root cause:
  - reducer path is straightforward and single-source
- Minimal solution:
  - none
- Risk level: low

#### Finding DELETE-2 — Duplicate insert path is guarded on save-to-documents
- Status: INTENTIONAL
- Severity: INTENTIONAL
- Where it appears:
  - OCR result → save to documents
- Which documents:
  - OCR result saves
- Required data fields:
  - `rohText` signature slice
- Missing-data behavior:
  - duplicate check weakens if OCR text missing, but normal path provides text
- What happens now:
  - `OcrMvpScreen` checks existing docs before `ADD_DOKUMENT`
  - reducer also blocks same `rohText` prefix duplicate
- User impact:
  - obvious duplicate insert path not found
- Technical root cause:
  - duplicate check exists both before dispatch and in reducer
- Minimal solution:
  - none
- Risk level: low

### AppSheet / Modal Layout Risk

#### Finding SHEET-1 — `OptionsSheet` is not scrollable
- Status: SHOULD FIX
- Severity: SHOULD FIX
- Where it appears:
  - generic options modal
- Which documents:
  - any flow that opens `OptionsSheet`
- Required data fields:
  - long options list or larger accessibility text
- Missing-data behavior:
  - not applicable
- What happens now:
  - children render in plain `AppSheet` body without `ScrollView`
- User impact:
  - long option lists can clip below fold on smaller devices or larger fonts
- Technical root cause:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/detail-modals/OptionsSheet.tsx`
- Minimal solution:
  - wrap option list in `ScrollView` or convert to scrollable body container
- Risk level: medium

#### Finding SHEET-2 — `PaymentPrepareSheet` is not scrollable
- Status: SHOULD FIX
- Severity: SHOULD FIX
- Where it appears:
  - payment preparation sheet
- Which documents:
  - payment-capable docs with long recipient/reference data
- Required data fields:
  - long `recipient`, `reference`, or accessibility text scaling
- Missing-data behavior:
  - rows collapse naturally, but overflow risk remains with long content
- What happens now:
  - static info card inside `AppSheet`, no internal scroll
- User impact:
  - content or footer can feel cramped on smaller devices and large text settings
- Technical root cause:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/detail-modals/PaymentPrepareSheet.tsx`
- Minimal solution:
  - add body `ScrollView` when content grows
- Risk level: medium

#### Finding SHEET-3 — `ExportierenSheet` is currently safe but still non-scrollable
- Status: LATER
- Severity: LATER
- Where it appears:
  - export sheet
- Which documents:
  - all saved detail export flows
- Required data fields:
  - many export options or larger font sizes
- Missing-data behavior:
  - options filter out unavailable entries
- What happens now:
  - max 5–6 rows, no current clipping evidence
- User impact:
  - low current risk, but same structural limitation exists
- Technical root cause:
  - no internal scroll in `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/detail-modals/ExportierenSheet.tsx`
- Minimal solution:
  - only needed if options grow further
- Risk level: low

#### Finding SHEET-4 — `EinspruchSheet` is already internally scrollable
- Status: INTENTIONAL
- Severity: INTENTIONAL
- Where it appears:
  - appeal template sheet
- Which documents:
  - appeal-related docs
- Required data fields:
  - long draft text
- Missing-data behavior:
  - fallback empty-text message
- What happens now:
  - body uses `ScrollView` inside a max-height card
- User impact:
  - acceptable current behavior
- Technical root cause:
  - explicit scroll handling is present
- Minimal solution:
  - none
- Risk level: low

### Dead / Hidden Old Features

#### Finding DEAD-1 — `BelgeChatModal` and `ai_chat` remain reachable through smart-action routing, not through inline tools
- Status: LATER
- Severity: LATER
- Where it appears:
  - hidden modal/action infrastructure
- Which documents:
  - any doc if a smart action path emits `ai_chat`
- Required data fields:
  - chat-capable document and `chatWithDocument` backend path
- Missing-data behavior:
  - not audited via runtime here
- What happens now:
  - inline entry is gone, but `runDetailSmartAction('ai_chat')` still opens `chat`
  - `BelgeChatModal` is still mounted in `DetailModalsContainer`
- User impact:
  - low immediate user risk, but stale hidden feature still exists in live code
- Technical root cause:
  - code retained for compatibility / future reuse
- Minimal solution:
  - dead-entry cleanup audit later
- Risk level: low

#### Finding DEAD-2 — `HilfeModal` is mounted but has no current inline entry
- Status: LATER
- Severity: LATER
- Where it appears:
  - hidden modal infrastructure
- Which documents:
  - any doc if modal key is opened externally
- Required data fields:
  - none special
- Missing-data behavior:
  - not applicable
- What happens now:
  - no visible inline tool entry, but modal still mounted
- User impact:
  - low immediate risk
- Technical root cause:
  - feature removal was visibility-only, not code cleanup
- Minimal solution:
  - include in dead-entry cleanup audit
- Risk level: low

#### Finding DEAD-3 — Old generic template libraries were not found
- Status: NOT APPLICABLE
- Severity: NOT APPLICABLE
- Where it appears:
  - none in current app code
- Which documents:
  - none
- Required data fields:
  - none
- Missing-data behavior:
  - none
- What happens now:
  - `TemplateLibrary` / `ToneAdjuster` were not found in current frontend app code
- User impact:
  - none
- Technical root cause:
  - old generic draft system appears already replaced in app layer
- Minimal solution:
  - none
- Risk level: none

## 5. Decisions
- Changed in this audit task:
  - only this report file was updated
- Deliberately not changed in this audit task:
  - no UI patch
  - no routing patch
  - no OCR/backend/provider patch
  - no AppSheet redesign
- Why:
  - the task explicitly required finishing the audit before additional implementation
- Important current-state note:
  - the repository already includes post-audit fixes from earlier commits:
    - `604f59791` — hide unfinished signature and narrow reply entry
    - `54e5d480e` — hide secure link for local docs without `v4DocId`
  - this report reflects the current code state including those commits

## 6. Validation
- `npx tsc --noEmit`: PASS
- Tests run:
  - `src/__tests__/documentActionFlows.test.ts`
  - `src/__tests__/aiLabeler.test.ts`
  - result: PASS, 32 tests passed
- Manual checks: none in this audit turn; this was code inspection plus latest OCR job inspection.
- Remaining risks:
  - OCR timeout warning should only be reopened if a fresh current Google-path scan reproduces it
  - hidden old chat/help code remains in the codebase
  - some AppSheet children remain non-scrollable for long content / large fonts

## 7. Commit
- Commit hash: none for code
- Audit continuity commits referenced by current state:
  - `1f8d2b28d` `docs(audit): record mobile action consistency findings`
  - `604f59791` `fix(actions): hide unfinished signature and narrow reply entry`
  - `54e5d480e` `fix(export): hide Sicherer Link for local docs without v4DocId`

## 8. Follow-ups
1. Run one fresh normal scan on the current Google path and confirm whether `Analyse dauert länger als erwartet` still appears in real UI; only then decide whether `useOcrMvpJob.ts` needs timeout UX work.
2. Decide whether OCR result action `create_reply_draft` should stay preview-only or route into the same saved-document Antwort-Assistent after save.
3. Decide whether Excel export remains OCR-job-only in saved Detail, or add a generic saved-document spreadsheet export path.
4. Add scroll handling to `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/detail-modals/OptionsSheet.tsx`.
5. Add scroll handling or explicit overflow checks to `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/detail-modals/PaymentPrepareSheet.tsx`.
6. Run a dead-entry cleanup audit for `BelgeChatModal`, `HilfeModal`, and `runDetailSmartAction('ai_chat')`.
7. Reassess whether `Unterschrift entfernen` should remain visible while signing itself stays hidden.

## Ownership
This report was prepared by: Codex
Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-01-codex-mobile-action-consistency-audit.md`

Follow-up owner suggestion:
- Codex: action gating, OCR timeout UX, dead-entry cleanup, modal scroll fixes
- Claude: wording/localization review after those code changes
