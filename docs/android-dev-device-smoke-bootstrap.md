# Android dev device smoke bootstrap

Standard start-of-session routine for **physical Android device** dev-client smoke (Pixel 9 Pro and similar).

Run this **before** scanner, OCR, or analyse smoke. Skipping it causes false failures that look like parser or app bugs.

## Quick start

```bash
bash scripts/android-dev-bootstrap.sh
```

Optional: pin a device when multiple are connected:

```bash
ANDROID_SERIAL=53271FDAP001ER bash scripts/android-dev-bootstrap.sh
```

## Manual commands

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
adb reverse --list
adb shell am force-stop com.briefpilot.app
adb shell monkey -p com.briefpilot.app -c android.intent.category.LAUNCHER 1
```

Also ensure on the Mac:

- Metro: `npx expo start` (port **8081**)
- OCR backend: listening on host **8000** when testing analyse / save flows

## What each step does

| Step | Purpose |
|------|---------|
| `reverse tcp:8081` | Device dev-client loads JS bundle from Mac Metro |
| `reverse tcp:8000` | Device reaches local OCR/API backend at `http://127.0.0.1:8000` |
| `reverse --list` | Verify both tunnels are active |
| `force-stop` + `monkey` | Cold restart so app picks up fresh bundle and resolved host |

## OCR “offline” misdiagnosis (2026-06-10)

Symptom on device: *“Verbindung zur Analyse ist aktuell nicht möglich”* while Mac backend is healthy.

**Root cause:** missing `adb reverse tcp:8000 tcp:8000` — not Google parser, not ML Kit.

Log evidence when fixed: app resolves `http://127.0.0.1:8000` and analyse succeeds after reverse + app restart.

## Related

- Scanner lifecycle smoke: PR #30 (`fix(scanner): recover scan screen after Android scanner dismiss`)
- Pending manual follow-up (not merge blockers): AC-4 (Analyse abbrechen), AC-7 (Result → Scannen → cancel)
