# Fix: Signature Post-Save Fullscreen + Touch Block Regression
**Date:** 2026-06-02  
**Commit:** 6dd2546ed  
**Status:** FIXED  
**Severity:** P0

## Root Cause

`onOpenFullscreen?.()` was called IMMEDIATELY inside `onDone`, before `onClose()` completed the SignaturePdfSheet's close animation.

On iOS, two Modal components cannot transition simultaneously. When `DocumentPagesViewer` (visible=true) and `SignaturePdfSheet` (visible→false) animate at the same time, iOS renders DocumentPagesViewer as an invisible overlay that:
1. Doesn't visually appear → user sees no feedback
2. Consumes all touch events → ALL underlying buttons become non-functional

This was NOT caused by commit 2ec6a9c3b (semantic grouping). It was a pre-existing iOS Modal conflict that became visible during iOS smoke testing.

## Fix

`src/features/detail/DetailModalsContainer.tsx`

```javascript
// Before (immediate call — modal conflict):
onOpenFullscreen?.();

// After (delayed call — let sheet close first):
setTimeout(() => onOpenFullscreen?.(), 400);
```

400ms gives the sheet's close animation time to finish before the viewer opens.

Additionally fixed: toast message was hardcoded `'PDF unterschrieben und gespeichert'` (German) → `T('signature.v2.success_title')` (localized).

## Expected Behavior After Fix
1. Sign PDF → tap Kaydet
2. Haptic feedback
3. SignaturePdfSheet closes (~300ms animation)
4. After 400ms: signed PDF opens in fullscreen viewer
5. User closes viewer → returns to detail
6. All action buttons (Dışa Aktar, Düzenle, İmzayı kaldır, Belgeyi sil) fully functional
