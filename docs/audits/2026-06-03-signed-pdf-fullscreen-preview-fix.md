# Signed PDF Fullscreen / Scroll Freeze — Fix Record

- Date: 2026-06-03
- Platform: iOS (iPhone)
- Scope: Dokument tab scroll freeze after signing a PDF and closing fullscreen viewer

---

## Root Cause

After signing, `DetailModalsContainer.onDone` calls `openPagesViewer(0)` with a 400 ms delay.
`DocumentPagesViewer` opens a `Modal` containing `ViewerPageSlide → <Pdf>`.
On iOS, when the Modal closes (`visible=false`), React Native's `Modal` does not immediately
unmount its children — the native `react-native-pdf` gesture recognizers remain active and
intercept touches on the underlying `DetailDetailsTab` `ScrollView`, causing a full scroll freeze.

---

## Failed Approaches

### 1. `pointerEvents="none"` wrapper on inline preview Pdf
- Wrapped `<Pdf>` in `DocumentPreviewSection` with `<View pointerEvents="none">`.
- Did not resolve the freeze — the problem was in the fullscreen viewer, not the inline preview.
- Change was reverted.

### 2. `suspendPdfPreview` / viewer handoff (Codex attempt)
- Added a `viewerPreparing` + `suspendPdfPreview` prop chain through
  `DetailScreen → DetailDetailsTab → DetailsPanel → DocumentPreviewSection`.
- Unmounted the inline preview Pdf before opening fullscreen.
- Did not fully resolve the post-close gesture leak.
- Files touched: `DocumentPreviewSection.tsx`, `DetailsPanel.tsx`, `DetailDetailsTab.tsx`, `DetailScreen.tsx`.
- Rolled back; too many files touched for a narrow problem.

---

## Actual Fix

**File:** `src/features/detail/components/DocumentPagesViewer.tsx`
**Commit:** `00346b6bb` — `fix(viewer): defer pdf unmount to prevent scroll freeze after close`

Added a `mounted` state with a 350 ms delayed unmount on close:

```ts
const [mounted, setMounted] = useState(false);
useEffect(() => {
  if (visible) { setMounted(true); }
  else {
    const timer = setTimeout(() => setMounted(false), 350);
    return () => clearTimeout(timer);
  }
}, [visible]);
```

`<Modal visible={mounted}>` + `{mounted && <View>...</View>}` ensures the `<Pdf>` native
component (and its gesture recognizers) are fully unmounted after the fade animation completes.

---

## Related Fixes (same session)

| Commit | File | What |
|--------|------|------|
| `7fdc8647b` | `SignaturePdfSheet.tsx` | Exclude edit overlay from saved preview capture (first attempt — broke signature visibility) |
| `206511e59` | `SignaturePdfSheet.tsx` | Keep signature Image visible; hide only border + handles during capture |
| `29f56ebbe` | `config.ts` | Read `EXPO_PUBLIC_DEVICE_IP` first in `resolveDevConfig` so physical device IP is honoured |

---

## Validation

- `npx tsc --noEmit`: PASS
- iOS physical device:
  - İmza yerleştirirken mavi çerçeve görünür ✓
  - Kaydet → Dokument preview'da imza görünür, çerçeve yok ✓
  - Vollbild açılıyor ✓
  - Vollbild kapatınca Dokument tab scroll çalışıyor ✓

---

## Remaining Notes

- `docs/audits/2026-06-03-smoke-known-issues.md` — iOS signed PDF freeze kaydı bu fix ile kapandı.
- Android: E-Mail beyaz ekran (intermittent) ayrı oturumda takip edilecek.
