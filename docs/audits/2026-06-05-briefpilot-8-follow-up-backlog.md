# BriefPilot 8.0 — Follow-up Backlog

## 1. Current release candidate status

- 8.0 candidate: YES
- Current HEAD: `38a470ea3`
- Working tree: clean
- Known P0 blockers: none
- Device smoke notes pending

## 2. P0 — Must fix before 8.0 release

- None currently known
- If final device smoke finds an issue, add it here

## 3. P1 — Should verify before final 8.0

- iOS Reply Assistant screen-recorded smoke
  - `Erledigen → Einspruch → Reply Assistant`
  - `IHRE ANGABEN / EMPFÄNGER / VORGANG`
  - keyboard
  - Briefkopf preview/copy
  - amber high-risk / no amber low-risk
  - no send/export/share
- iOS OCR smoke
  - `Kamera` tab
  - `Dokument scannen / Datei / Aus Fotos`
  - backend offline/error does not hide entry UI
  - backend online analyze starts
- Login/Auth header visual check
  - finalized document-B icon visible
- Android app open smoke after icon sync
  - app opens
  - launcher/adaptive icon still correct

## 4. P2 — After 8.0

- Reply Assistant PDF export / PDF vorbereiten
- Reply Assistant E-Mail vorbereiten / `mailto`
- Reply Assistant Versandweg-Hilfe
- Reply Assistant `__DEV__` guard → beta feature flag
- Backend diagnostics panel
- OCR automated tests
- Web favicon smoke
- Splash visual polish if needed
- AppFooter sparkle review if brand consistency becomes strict

## 5. Explicitly closed / do not reopen now

- Logo design selection
- Brand raster asset generation
- Android native launcher icon sync
- OCR stale IP/dev backend resolver
- OCR entry offline/error lockout
- Reply Assistant V1 copy-only draft format
- Splash config wiring
- Onboarding finalized icon
- Auth header finalized icon

## 6. Next recommended action

- Run final device smoke
- Capture screen recordings
- If PASS, mark 8.0 release candidate as accepted
- Then tag/merge planning
