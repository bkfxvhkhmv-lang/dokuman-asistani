## Metadata
- Date: 2026-06-03
- Scope: iOS signed PDF Detail preview freeze after signature save
- Status: FIX CANDIDATE

## Root cause
- The previous fullscreen-only handoff fix candidate was not sufficient.
- New device observation showed the freeze already existed inside the Dokument tab:
  - signed PDF preview visible
  - Vollbild tap fails
  - preview tap fails
  - Dokument tab cannot scroll
  - other tabs still work
- This points to the inline `react-native-pdf` preview on iOS as the likely touch/scroll blocker after the signed PDF update.

## Fix direction
- Keep signed PDF visible in Dokument tab.
- Do not use a blank PDF placeholder.
- For iOS signed PDFs only:
  - store a real raster preview image captured from the actual signed PDF placement view
  - render that image in `DocumentPreviewSection`
  - keep fullscreen viewer as the real PDF renderer

## Files changed
- `src/store/types.ts`
- `src/features/detail/modals/SignaturePdfSheet.tsx`
- `src/features/detail/DetailModalsContainer.tsx`
- `src/features/detail/detail-screen/useDetailBildschirmLogic.ts`
- `src/features/detail/components/details-panel/DocumentPreviewSection.tsx`
- `src/features/detail/DetailScreen.tsx`
- `src/features/detail/components/DetailsPanel.tsx`
- `src/features/detail/components/tabs/DetailDetailsTab.tsx`

## Why this should avoid the iOS freeze
- The signed document preview remains visible and includes the placed signature.
- The Detail tab no longer needs to mount inline `react-native-pdf` for signed PDFs on iOS.
- Fullscreen stays the only live PDF renderer in that signed iOS path.
- Reverting the signature clears the preview image state.

## Validation
- `npx tsc --noEmit`: PASS
- iOS physical device: PENDING
- Android secondary: PENDING

## Required device checks
1. Sign a PDF on iOS physical device
2. Dokument tab shows the actual signed page preview
3. Signature is visible in preview
4. Dokument tab scroll works
5. `Vollbild` opens fullscreen
6. Preview tap opens fullscreen if tappable
7. Fullscreen shows signed PDF with signature
8. Close fullscreen returns cleanly
9. Export / Edit / Revert signature / Delete still work
