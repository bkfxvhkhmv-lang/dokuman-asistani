# Residual I18n Sweep

## Report Metadata
- Author/Agent: Codex
- Role: residual i18n cleanup
- Date: 2026-06-02
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: 421272077
- Task type: fix / validation
- Scope: residual camera, scan, action and display strings
- Status: PASS

## 1. Scope
- Read [UI_DESIGN_GUARDRAILS.md](/Users/bayramgul/bp_canavar_v6_refactor/docs/design/UI_DESIGN_GUARDRAILS.md) first and kept copy calm, concise, and utility-first.
- Inspected and localized only the residual string surfaces in:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/modules/scanner/engine/camera-overlay-color.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/CameraView.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/camera-view/CameraTopBar.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/OptimisticDokumentKarte.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/hooks/useSheet.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/document-actions/payment.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/document-actions/calendarAndAppeals.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/document-actions/sharing.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/ShareUploadService.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/displaySanitizer.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/riskAnalysis.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/ActionSimulatorModal.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/services/documentActionFlows.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentAnalysis.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`

## 2. Search commands used
- `sed -n '1,240p' ...` on the scoped source files
- `rg -n "useT\\(|getLangSync\\(|hardcoded string patterns" src/...`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npx tsc --noEmit`
- scoped residual grep on the touched files for previously hardcoded DE strings
- `git -C /Users/bayramgul/bp_canavar_v6_refactor status --short`

## 3. Files touched
- [camera-overlay-color.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/modules/scanner/engine/camera-overlay-color.ts)
  - reason: scanner overlay status strings now use runtime locale
  - type: code
- [CameraView.tsx](/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/CameraView.tsx)
  - reason: capture, guide, countdown, and auto labels now use `useT()`
  - type: code
- [CameraTopBar.tsx](/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/camera-view/CameraTopBar.tsx)
  - reason: abort confirmation and auto label localized
  - type: code
- [OptimisticDokumentKarte.tsx](/Users/bayramgul/bp_canavar_v6_refactor/src/components/OptimisticDokumentKarte.tsx)
  - reason: optimistic analyzing label localized
  - type: code
- [useSheet.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/hooks/useSheet.ts)
  - reason: default sheet labels now use current UI locale
  - type: code
- [payment.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/document-actions/payment.ts)
  - reason: payment notices and payment prep sheet copy localized
  - type: code
- [calendarAndAppeals.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/document-actions/calendarAndAppeals.ts)
  - reason: calendar, mail, and PDF notices localized
  - type: code
- [sharing.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/document-actions/sharing.ts)
  - reason: share/original/secure-link notices localized
  - type: code
- [ShareUploadService.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/services/ShareUploadService.ts)
  - reason: share-upload notifications and fallback titles localized
  - type: code
- [displaySanitizer.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/utils/displaySanitizer.ts)
  - reason: display fallback titles localized at render time
  - type: code
- [riskAnalysis.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/utils/riskAnalysis.ts)
  - reason: legacy risk prose moved off hardcoded German strings
  - type: code
- [ActionSimulatorModal.tsx](/Users/bayramgul/bp_canavar_v6_refactor/src/components/ActionSimulatorModal.tsx)
  - reason: simulator chrome and scenario copy localized
  - type: code
- [documentActionFlows.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/services/documentActionFlows.ts)
  - reason: mail/payment template chrome localized
  - type: code
- [documentAnalysis.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentAnalysis.ts)
  - reason: residual badge/summary/weekly-overview strings localized
  - type: code
- [translations.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts)
  - reason: added residual sweep key coverage for all 7 locales
  - type: i18n

## 4. Findings
- status: fixed
  - severity: should fix
  - user impact: scanner and camera flow still leaked German UI text in non-German locales
  - technical root cause: native scan surfaces used hardcoded strings instead of `useT()` or `getLangSync()+t()`
  - minimal solution: localized camera overlay, top bar, capture toasts, optimistic card, and sheet defaults

- status: fixed
  - severity: should fix
  - user impact: payment, calendar, share, and export notices could appear in German regardless of selected UI locale
  - technical root cause: document action hooks built notice strings inline
  - minimal solution: route all user-visible notice/sheet labels through translation keys

- status: fixed
  - severity: should fix
  - user impact: fallback document titles and residual analysis/simulator copy could still break language purity on low-traffic surfaces
  - technical root cause: utility layers returned German fallback prose directly
  - minimal solution: moved fallback prose to translation keys and used display-time locale lookup

- status: intentional
  - severity: later
  - user impact: none in this commit
  - technical root cause: user explicitly kept broader SmartRiskPanel/smart-risk-engine prose out of this sweep unless validation forced it
  - minimal solution: not touched here

## 5. Decisions
- Changed:
  - localized residual scanner/camera chrome
  - localized residual sheet/notice/action strings
  - localized legacy fallback prose in display/risk/document analysis utilities
  - added 7-locale translation coverage for the new key set
- Deliberately not changed:
  - behavior, OCR/provider logic, AI logic, Android visuals, payment/AppSheet logic
  - SmartRiskPanel and smart-risk-engine runtime prose surfaces
- Why:
  - task scope was residual UI language cleanup only

## 6. Validation
- `npx tsc --noEmit`: PASS
- scoped hardcoded residual grep on the touched files: clean
- tests run: none
- `git status --short`: clean after commits
- remaining risks:
  - this sweep did not cover unrelated legacy modals/alerts outside the declared scope
  - FR/ES/RU/AR residual sweep keys use shared fallback copy rather than tone-polished locale-specific prose

## 7. Commit
- code commit: `421272077`
- code message: `fix(i18n): sweep residual camera, scan, action and display strings`

## 8. Follow-ups
- Run a device smoke pass on scan/camera/payment/share flows to verify tone and locale consistency on real surfaces.
- If needed later, do a separate locale-polish pass for the shared fallback copy used by FR/ES/RU/AR residual sweep keys.

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/modules/scanner/engine/camera-overlay-color.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/CameraView.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/camera-view/CameraTopBar.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/OptimisticDokumentKarte.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/hooks/useSheet.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/document-actions/payment.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/document-actions/calendarAndAppeals.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/document-actions/sharing.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/ShareUploadService.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/displaySanitizer.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/riskAnalysis.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/ActionSimulatorModal.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/services/documentActionFlows.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentAnalysis.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-residual-i18n-sweep.md`

Follow-up owner suggestion:
- Codex: device smoke verification
