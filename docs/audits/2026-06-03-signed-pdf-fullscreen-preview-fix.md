## Metadata
- Date: 2026-06-03
- Scope: signed PDF fullscreen preview regression in Detail / Dokument tab
- Commit: `146a98365` `fix(pdf): restore signed document fullscreen preview`

## Root cause
- The failed `pointerEvents="none"` hypothesis was not the real root cause.
- The preview tap/button wiring already pointed to `openPagesViewer(0)`.
- The remaining regression path was specific to PDF sources, especially signed PDFs:
  - Detail preview mounted a `react-native-pdf` instance for the signed file URI.
  - Fullscreen viewer mounted another `react-native-pdf` instance for the same URI at open time.
  - On iOS this can leave the detail surface in a stuck/touch-frozen state while fullscreen never completes its presentation.

## Failed hypothesis ruled out
- Wrapping preview `<Pdf>` in `<View pointerEvents="none">` did not solve the fullscreen freeze.
- That change was removed from the effective fix path and replaced by a viewer handoff fix.

## Fix
- Added a small fullscreen handoff for PDF viewer opens:
  - when opening fullscreen for a PDF, suspend the inline preview PDF first
  - then open fullscreen on the next frame
- This avoids keeping two `react-native-pdf` views alive against the same signed URI during the transition.

## Files changed
- `src/features/detail/components/details-panel/DocumentPreviewSection.tsx`
- `src/features/detail/components/DetailsPanel.tsx`
- `src/features/detail/components/tabs/DetailDetailsTab.tsx`
- `src/features/detail/DetailScreen.tsx`

## Why this avoids invisible overlays / PDF deadlock
- `DocumentPagesViewer` was not the source of invisible touch interception while hidden.
- The risk was simultaneous preview/viewer PDF mounting against the same file URI.
- The new `viewerPreparing` + `suspendPdfPreview` handoff ensures:
  - the inline preview PDF is unmounted first
  - fullscreen viewer opens after that handoff
  - preview remains unchanged for images and non-PDF paths

## Validation status
- `npx tsc --noEmit`: PASS
- iOS physical device: PENDING, required before final PASS
- Android secondary: not tested in this turn

## Required device checks
1. Signed PDF in Dokument tab:
   - tap preview -> fullscreen opens
   - tap `Vollbild` -> fullscreen opens
2. Fullscreen shows signed PDF with signature
3. Close fullscreen returns to Detail without freeze
4. After close, these still work:
   - Export
   - Edit
   - Revert signature
   - Delete confirm
5. Unsigned PDF fullscreen still works
6. Image document fullscreen still works
