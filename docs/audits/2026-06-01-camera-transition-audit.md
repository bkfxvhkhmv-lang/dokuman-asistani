# Camera to Analysis Transition Audit

## Report Metadata
- Author/Agent: Codex
- Role: mobile code/action consistency audit
- Date: 2026-06-01
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: pending at report update time
- Task type: audit / fix / validation
- Scope: camera capture to OCR analysis transition, scanner mount/unmount, loading surface continuity
- Status: PASS

## 1. Scope
- Inspected the scan-to-analysis path for OCR MVP and related scanner components.
- Searched files:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/OcrMvpScreen.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/scanner/ExpoScannerProvider.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/components/OcrMvpUploadBox.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/components/OcrMvpStatusCard.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/modules/scanner/engine/VisionKitScanner.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/scanner/ScannerView.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/kamera-screen/KameraScreenView.tsx`
- Feature area:
  - OCR MVP scan flow
  - scanner dismissal
  - loading/result surface continuity

## 2. Search commands used
- `git rev-parse --short HEAD && git branch --show-current && git status --short`
- `rg -n "OcrMvpScreen|ExpoScannerProvider|Camera|capture|preview|loading|analys|scanner|modal|header" src/features/ocr-mvp src/providers src/components src/screens`
- `sed -n '1,260p' src/features/ocr-mvp/OcrMvpScreen.tsx`
- `sed -n '260,420p' src/features/ocr-mvp/OcrMvpScreen.tsx`
- `sed -n '1,220p' src/features/ocr-mvp/scanner/ExpoScannerProvider.ts`
- `sed -n '1,240p' src/features/ocr-mvp/components/OcrMvpUploadBox.tsx`
- `sed -n '1,260p' src/components/scanner/ScannerView.tsx`
- `sed -n '1,220p' src/modules/scanner/engine/VisionKitScanner.ts`
- `sed -n '320,420p' src/features/scan/kamera-screen/KameraScreenView.tsx`
- `npx tsc --noEmit`

## 3. Files touched
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-01-camera-transition-audit.md`
  - reason: permanent audit report
  - type of change: docs

## 4. Findings
- status: intentional
  - severity: INTENTIONAL
  - user impact: OCR MVP does not use the custom React `ScannerView` camera surface during the main scan flow
  - technical root cause: `OcrMvpUploadBox` calls `ExpoScannerProvider.takePhotoWithScanner()`, which uses native VisionKit on iOS and `expo-image-picker` camera fallback otherwise
  - minimal solution: none; this clarifies that React camera unmount timing is not the primary source of the observed hard cut

- status: fixed-in-design / current behavior
  - severity: SHOULD FIX
  - user impact: after capture, the user does not see the camera freeze with a loading overlay; they return to the OCR MVP screen and only then see either the selected-asset card or the loading state
  - technical root cause: native scanner/camera dismisses first, then `setSelectedAsset()` updates `OcrMvpUploadBox`, and only after tapping `Analysieren` does `OcrMvpScreen` switch to `OcrMvpStatusCard`
  - minimal solution: if polished later, keep the captured preview continuously visible and overlay loading on top instead of bouncing back through the selected-asset card

- status: fixed
  - severity: SHOULD FIX
  - user impact: a brief dark/hard cut was plausible during native scanner dismissal because the underlying `OcrMvpScreen` header (`Analysieren`) was always mounted
  - technical root cause: `OcrMvpScreen` rendered its header unconditionally while native VisionKit/image-picker camera appeared above it and dismissed asynchronously
  - minimal solution: add `scannerOpen` state and hide idle header/intro chrome while the native scanner is presenting

- status: intentional
  - severity: NOT APPLICABLE
  - user impact: there is no code path in OCR MVP where both camera and loading surfaces are React-mounted at the same time
  - technical root cause: the camera is native outside the React tree; once `status` becomes `uploading/processing`, `OcrMvpScreen` swaps to `OcrMvpStatusCard`
  - minimal solution: none for root-cause identification

- status: later
  - severity: SHOULD FIX
  - user impact: there is a continuity gap before analysis starts because `selectedAsset` screen and `Analysieren` status are separate surfaces
  - technical root cause: flow is:
    1. native scanner opens
    2. native scanner dismisses
    3. selected-asset confirmation card appears
    4. user taps `Analysieren`
    5. status card appears
  - minimal solution: merge steps 3 and 5 visually, or start analysis immediately after scan when confidence is high

- status: intentional
  - severity: NOT APPLICABLE
  - user impact: result modal dismiss does not remount the scanner
  - technical root cause: `OcrMvpResultCard` preview modal is independent of the scan provider and only opens after result state
  - minimal solution: none

- status: later
  - severity: SHOULD FIX
  - user impact: reported stale `Analysieren` header over camera is plausible as an artifact of native scanner dismissal timing, but not proven to be a broken duplicate React header
  - technical root cause: the only persistent OCR MVP header is in `OcrMvpScreen`; no second `Analysieren` header was found in the OCR MVP scan path
  - minimal solution: instrument scanner-open/scanner-close state and test on device before patching

## 5. Decisions
- What was changed:
  - added `scannerOpen` coordination between `OcrMvpUploadBox` and `OcrMvpScreen`
  - hid/faded the persistent OCR MVP header and idle upload chrome while the native scanner is open
- What was deliberately not changed:
  - no scanner code
  - no OCR MVP flow code
  - no native scanner bridge
- Why:
  - the root cause was narrow enough for a safe UI-state guard
  - broader scan-flow redesign is still unnecessary in this pass

## 6. Validation
- `npx tsc --noEmit`: PASS
- Tests run: none
- Manual checks: code-path audit only
- Remaining risks:
  - native VisionKit/image-picker dismissal may still feel abrupt
  - the “dark frame” may be partly expected native transition, partly product polish debt
  - selected-asset card and loading state are still separate surfaces, so continuity is improved but not fully redesigned

## 7. Commit
- commit hash: pending at report update time
- commit message: `fix(scan): reduce native scanner transition flicker`

## 8. Follow-ups
1. Device-check whether the stale `Analysieren` header flash is now gone on both scanner cancel and scanner capture.
2. Prototype a continuous capture preview flow where the selected asset card and loading state share one surface instead of hard switching.
3. Capture a focused on-device recording of: tap `Dokument scannen` → native scanner dismiss → selected asset card → `Analysieren` → loading, to measure remaining perceived hard cut after the guard fix.

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-01-camera-transition-audit.md`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/OcrMvpScreen.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/components/OcrMvpUploadBox.tsx`

Follow-up owner suggestion:
- Codex: scan-flow state coordination and header gating
- Claude: copy review only if scan state labels change later
