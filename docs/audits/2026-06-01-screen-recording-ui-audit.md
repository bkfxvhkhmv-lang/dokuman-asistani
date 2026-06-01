# Screen Recording UI Audit Fixes

## Report Metadata
- Author/Agent: Codex
- Role: mobile UI/review consistency fix
- Date: 2026-06-01
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: pending at report write time
- Task type: fix / validation
- Scope: OCR result export copy, review warning gating, list-card deadline copy, OCR loading copy
- Status: PASS

## 1. Scope
- Inspected and fixed issues surfaced by the uploaded screen recording audit.
- Searched and updated:
  - `src/features/ocr-mvp/components/`
  - `src/features/detail/components/details-panel/`
  - `src/utils/`
  - `src/i18n/translations.ts`
- Feature area:
  - OCR result screen
  - review/hint generation
  - document-list subtitle copy
  - OCR analysis loading copy

## 2. Search commands used
- `rg -n "Excel für Steuerberater herunterladen|Beträge und Fristen|Bitte Betrag und Kommastellen prüfen|Frist prüfen|wichtige Angaben|Excel herunterladen|Excel exportieren" src`
- `rg -n "reviewReasons|needsManualReview|Kommastellen|betrag|frist|deadline|Hinweise|offene Hinweise" src/features src/services src/store`
- `sed -n '1,220p' src/features/ocr-mvp/components/OcrMvpActionSummary.tsx`
- `sed -n '1,220p' src/features/ocr-mvp/components/OcrMvpStatusCard.tsx`
- `sed -n '1,220p' src/features/detail/components/details-panel/OcrConfidenceSection.tsx`
- `sed -n '1,260p' src/utils/documentGuards.ts`
- `sed -n '1,220p' src/utils/listCardSummary.ts`
- `rg -n "ocr.preparing" src/i18n/translations.ts`
- `npx tsc --noEmit`
- `npm test -- --runInBand src/__tests__/documentGuards.test.ts`
- `python3` key-count check for 7-language coverage

## 3. Files touched
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/components/OcrMvpActionSummary.tsx`
  - reason: remove misleading single-document Excel copy
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/components/OcrMvpStatusCard.tsx`
  - reason: generic loading copy and translated status steps
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/details-panel/OcrConfidenceSection.tsx`
  - reason: suppress amount warnings for non-payment documents
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentGuards.ts`
  - reason: central payment-like / deadline-sensitive document guards
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/listCardSummary.ts`
  - reason: stop showing `Frist prüfen` for normal invoices without deadline context
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
  - reason: add OCR loading/status keys in all 7 languages
  - type of change: i18n

## 4. Findings
- status: fixed
  - severity: BLOCKER
  - user impact: single-document OCR result screen implied a Steuerberater package via `Excel für Steuerberater herunterladen`
  - technical root cause: `OcrMvpActionSummary.tsx` hardcoded the wrong label for `export_excel`
  - minimal solution: switched the button to the existing per-document Excel key `ocr.result.excel`

- status: fixed
  - severity: SHOULD FIX
  - user impact: medical / form-like documents could still show `Bitte Betrag und Kommastellen prüfen.`
  - technical root cause: OCR risk messages were mapped without checking whether the document type is payment-like
  - minimal solution: filter amount-specific risk messages out for non-payment documents in `OcrConfidenceSection.tsx`

- status: fixed
  - severity: SHOULD FIX
  - user impact: normal invoices could show `78,73 € · Frist prüfen` in list cards even when no deadline was expected
  - technical root cause: `buildCardInsight()` treated every amount-only document as a deadline hint
  - minimal solution: only emit `Frist prüfen` when the document is deadline-sensitive; otherwise show the amount only

- status: fixed
  - severity: SHOULD FIX
  - user impact: OCR loading screen sounded payment/deadline-specific for every document type
  - technical root cause: `OcrMvpStatusCard.tsx` hardcoded `Beträge und Fristen` copy for all documents
  - minimal solution: replaced with generic `wichtige Angaben` messaging and added 7-language translation keys

- status: intentional
  - severity: LATER
  - user impact: internal raw OCR risk mapping still contains the German amount string
  - technical root cause: raw risk-to-message map is shared, but non-payment suppression now happens downstream
  - minimal solution: keep as-is for now; the visible leak is closed

## 5. Decisions
- What changed:
  - single-document Excel button now uses normal Excel wording
  - amount warnings no longer surface on non-payment docs
  - amount-only invoice cards no longer claim `Frist prüfen`
  - OCR loading copy is now generic and translated
- What was deliberately not changed:
  - OCR provider routing
  - backend AI provider logic
  - Antwort-Assistent
  - AI Labeler
  - payment/AppSheet
  - Android-specific code
- Why:
  - this pass was limited to visible UI/copy/review-reason issues from the screen recording

## 6. Validation
- `npx tsc --noEmit`: PASS
- Tests run:
  - `npm test -- --runInBand src/__tests__/documentGuards.test.ts`
  - result: PASS (`10/10`)
- 7-language key check:
  - `ocr.status.title`: 7
  - `ocr.status.subtitle`: 7
  - `ocr.status.hint`: 7
  - `ocr.status.secure`: 7
  - `ocr.status.step.prepared`: 7
  - `ocr.status.step.text`: 7
  - `ocr.status.step.details`: 7
  - `ocr.status.step.saving`: 7
  - `ocr.status.step.almost_done`: 7
  - `ocr.result.excel`: 7
- Remaining risks:
  - document type normalization (`Dokument` / `Sonstiges`) is still broader product work
  - long OCR-derived titles still need a separate title-sanitization pass

## 7. Commit
- commit hash: pending at report write time
- commit message: `fix(ui): clean result export copy and review warnings`

## 8. Follow-ups
1. Audit title sanitization for OCR results so sender-address lines do not become document titles.
2. Re-check `offene Hinweise` count inflation after these review-gating changes on a realistic device dataset.
3. Audit low-contrast preview hint copy (`Falsch gedreht? Im Vollbild drehen.`) and raise contrast if still too faint.
4. Consider making `Angaben bearbeiten` subtitle dynamic for non-payment documents.

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/components/OcrMvpActionSummary.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/components/OcrMvpStatusCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/details-panel/OcrConfidenceSection.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentGuards.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/listCardSummary.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-01-screen-recording-ui-audit.md`

Follow-up owner suggestion:
- Codex: review-count and title-sanitization code fixes
- Claude: copy/i18n review if wording needs refinement
