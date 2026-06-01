# Mobile Action Consistency Audit

## Report Metadata
- Author/Agent: Codex
- Role: mobile code/action consistency audit
- Date: 2026-06-01
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: 93de9c27b
- Task type: audit / validation / docs
- Scope: code health, saved document actions, export/reply/share flows
- Status: FOLLOW-UP REQUIRED

## 1. Scope
- Feature area: saved document Detail actions, export/reply/share flows, OCR result action handoff, modal/action consistency.
- Inspected code paths:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/hooks/`
- Focus:
  - action availability and routing for Excel, PDF, original file, text share, reply, sign, delete, AI labeler
  - stale route/action references
  - code-level layout/safe-area risks
- Explicitly not focused on translations. Claude is handling localization separately.

## 2. Search Commands Used
- `git -C /Users/bayramgul/bp_canavar_v6_refactor branch --show-current`
- `git -C /Users/bayramgul/bp_canavar_v6_refactor rev-parse --short HEAD`
- `git -C /Users/bayramgul/bp_canavar_v6_refactor status --short`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npx tsc --noEmit`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npm test -- --runInBand src/__tests__/documentActionFlows.test.ts src/__tests__/aiLabeler.test.ts`
- `rg -n "TemplateLibrary|ToneAdjuster|chatWithDocument|reply_draft|Draft|Vorlage|downloadOcrResult|ExportierenSheet|Antwort schreiben|yanitSablon|reply|ocrJobId|v4DocId" /Users/bayramgul/bp_canavar_v6_refactor/src`
- `rg -n "EXPO_PUBLIC_VISION_API_KEY|OPENAI|ANTHROPIC|GEMINI|CLAUDE|api key|chatWithDocument\(" /Users/bayramgul/bp_canavar_v6_refactor/src`
- File inspections with `sed` for:
  - `src/features/detail/DetailModalsContainer.tsx`
  - `src/features/detail/hooks/useDetailMoreItems.ts`
  - `src/features/detail/components/tabs/DetailActionsTab.tsx`
  - `src/features/detail/hooks/useDocumentActions.ts`
  - `src/features/detail/hooks/document-actions/sharing.ts`
  - `src/features/detail/hooks/document-actions/editFlow.ts`
  - `src/design/components/AppSheet.tsx`
  - `src/features/detail/modals/SignaturePdfSheet.tsx`
  - `src/components/YanıtSablonlariModal.tsx`
  - `src/features/ocr-mvp/OcrMvpResultCard.tsx`
  - `src/services/AiLabelerService.ts`
  - `src/features/detail/services/detailSmartRouting.ts`

## 3. Files Touched
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-01-codex-mobile-action-consistency-audit.md`
  - reason: final audit report required by process
  - type of change: docs

## 4. Findings

### Finding 1
- Status: fixed earlier, revalidated
- Severity: blocker
- User impact: first normal scan can show “Analyse dauert länger als erwartet” even when backend OCR later succeeds.
- Technical root cause: frontend OCR polling timeout is 30s while recent ABBYY jobs in local job DB complete in ~39–56s.
- Minimal solution: raise polling timeout or switch to “still processing in background” UX instead of hard timeout at 30s.
- Evidence:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/hooks/useOcrMvpJob.ts` → `POLL_TIMEOUT_MS = 30_000`
  - local OCR DB rows showed `abbyy_xml` jobs completing in `39519ms`, `49290ms`, `55967ms`

### Finding 2
- Status: intentional
- Severity: should fix
- User impact: `Antwort schreiben` appears on some non-Finanzamt documents and opens a support notice instead of a productive drafting flow.
- Technical root cause: inline tool visibility is broad (`Behörden / Amt`, `Versicherung`, `mail`, `einspruch`) in `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/useDetailMoreItems.ts`, but the modal implementation in `/Users/bayramgul/bp_canavar_v6_refactor/src/components/YanıtSablonlariModal.tsx` is Finanzamt-only.
- Minimal solution: tighten visibility/gating for `Antwort schreiben` to Finanzamt-like documents, or relabel the action before opening the modal.

### Finding 3
- Status: intentional
- Severity: should fix
- User impact: `PDF unterschreiben` is still reachable for signable document types even though recent manual testing concluded the interaction quality is not release-ready.
- Technical root cause: inline tools still add `menu_signpdf` for `Formular`, `Vertrag`, `Antrag`, `Behörden / Amt` in `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/useDetailMoreItems.ts`, and `DetailModalsContainer` still mounts `SignaturePdfSheet`.
- Minimal solution: hide the action again until a better placement/signature UX is shipped, or narrow it behind a stronger readiness gate.

### Finding 4
- Status: intentional
- Severity: should fix
- User impact: Excel export is available only for OCR-MVP-backed stored docs; cloud-only or manually created docs cannot access the same export option even if they have other export actions.
- Technical root cause: `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/DetailModalsContainer.tsx` passes `onExcel` only when `dok.ocrJobId` exists, and `downloadOcrResult()` depends on OCR job artifacts.
- Minimal solution: either clearly keep Excel as OCR-result-only behavior, or add a separate spreadsheet export path for saved docs without `ocrJobId`.

### Finding 5
- Status: later
- Severity: later
- User impact: stale chat/help modal paths remain in code and could be accidentally re-exposed by future UI wiring.
- Technical root cause: `BelgeChatModal`, `HilfeModal`, and `runDetailSmartAction('ai_chat')` still exist, while inline tool entries were removed. `chatWithDocument` is still used by `BelgeChatModal` and `DigestAIService`.
- Minimal solution: leave shared code intact for now, but add a follow-up cleanup audit to remove or isolate unused detail entry points.

### Finding 6
- Status: intentional
- Severity: should fix
- User impact: some sheet/modal content can clip on smaller devices if child content grows because `AppSheet` itself is not scrollable.
- Technical root cause: `/Users/bayramgul/bp_canavar_v6_refactor/src/design/components/AppSheet.tsx` sets `maxHeight: '88%'` and renders `children` inside a plain `View`; scrolling depends entirely on each child implementation.
- Minimal solution: keep `AppSheet` generic, but ensure long-content sheets always wrap their body in `ScrollView` and add bottom safe-area padding.

### Finding 7
- Status: intentional
- Severity: not applicable
- User impact: none in AI Labeler path.
- Technical root cause: AI Labeler no longer uses direct `chatWithDocument`; it routes through OCR MVP backend via `labelDocumentViaOcrMvp` in `/Users/bayramgul/bp_canavar_v6_refactor/src/services/AiLabelerService.ts`.
- Minimal solution: no change required.
- Note: frontend still contains `EXPO_PUBLIC_VISION_API_KEY` for the legacy vision OCR path in `/Users/bayramgul/bp_canavar_v6_refactor/src/services/vision-api/constants.ts`; this is separate from AI labeling.

### Finding 8
- Status: intentional
- Severity: not applicable
- User impact: none.
- Technical root cause: old generic reply/template libraries (`TemplateLibrary`, `ToneAdjuster`) were not found in the current app code. The active reply entry is `yanitSablon` → `YanıtSablonlariModal`.
- Minimal solution: no change required.

## 5. Decisions
- Changed:
  - Wrote this audit report only.
- Deliberately not changed:
  - no action routing changes
  - no modal/sheet redesign
  - no i18n work
  - no OCR/backend/provider changes
  - no signature flow changes
- Why:
  - the task requested a final audit before Android work, with fixes only if tiny and safe
  - current issues are product-level gating/consistency decisions, not one-line mechanical breakages
  - broader changes would risk reopening settled flows right before Android work

## 6. Validation
- `npx tsc --noEmit`: PASS
- Tests run:
  - `npm test -- --runInBand src/__tests__/documentActionFlows.test.ts src/__tests__/aiLabeler.test.ts`
  - result: PASS, 32 tests passed
- Manual checks: none performed in this audit turn; this was code inspection and validation only.
- Remaining risks:
  - saved document actions still expose some flows whose product scope is narrower than their visibility rules
  - `AppSheet` children can still clip if future long forms are mounted without internal scroll
  - OCR result timeout remains the most visible build-side trust issue until adjusted

## 7. Commit
- Commit hash: none
- Commit message: none

## 8. Follow-ups
1. Raise or redesign OCR polling timeout in `/Users/bayramgul/bp_canavar_v6_refactor/src/hooks/useOcrMvpJob.ts` so normal ABBYY runs do not show premature timeout.
2. Restrict `Antwort schreiben` visibility in `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/useDetailMoreItems.ts` to Finanzamt-like documents, or add a more precise fallback label.
3. Remove or hide `PDF unterschreiben` from `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/useDetailMoreItems.ts` until signature UX is reworked.
4. Decide whether Excel export should remain OCR-job-only; if yes, document this in the export UX, if no, add a saved-document spreadsheet export path.
5. Run a separate dead-entry cleanup audit for `BelgeChatModal`, `HilfeModal`, and `runDetailSmartAction('ai_chat')` to prevent accidental re-exposure.
6. Audit all `AppSheet`-based long-form modals and wrap long bodies in `ScrollView` where missing.

## Ownership
This report was prepared by: Codex
Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-01-codex-mobile-action-consistency-audit.md`

Follow-up owner suggestion:
- Codex: code consistency fixes for saved document action gating and OCR timeout handling
- Claude: i18n/copy review for any wording changes caused by those follow-up fixes
