# Release Snapshot — 2026-06-03

## Status: STORE CANDIDATE

Branch: `feature/ocr-api-integration`

---

## Final Smoke Ergebnisse

| Check | Ergebnis |
|-------|----------|
| OCR Analyze Flow (iOS + Android) | PASS |
| iOS Signed PDF Preview + Vollbild | PASS |
| Android Native Scanner + OCR | PASS |
| TR / DE i18n Smoke | PASS |
| Android E-Mail Weißbild | nicht reproduzierbar |
| `npx tsc --noEmit` | PASS |
| `git status --short` | sauber |

---

## Fixes in dieser Session (2026-06-03)

| Commit | Beschreibung |
|--------|-------------|
| `0505a80` | revert(api): restore root OCR MVP routes |
| `1f321dd` | fix(config): restore OCR MVP root backend contract |
| `7fdc864` | fix(pdf): exclude signature edit overlay from saved preview |
| `00346b6` | fix(viewer): defer pdf unmount to prevent scroll freeze after close |
| `29f56eb` | fix(config): honor explicit device IP for local OCR backend |
| `206511e` | fix(pdf): keep signature visible while hiding edit chrome in saved preview |
| `6abb05d` | docs(audit): update signed pdf fullscreen fix record |
| `7f3e72a` | docs(smoke): update known issues after pdf viewer fix |
| `d914258` | fix(i18n): add missing DE translations for scan, home and ocr keys |

---

## Offene Punkte (kein Release-Blocker)

- **Android E-Mail Weißbild** — einmal beobachtet, nicht reproduzierbar. Bleibt als Known Issue; vor nächstem Release erneut testen.

---

## Nächste Schritte

TestFlight Upload → Store Submission.
