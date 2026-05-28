# Release Readiness Snapshot — 2026-05-28

**Purpose:** Point-in-time summary of what is done, what is not, and what comes next.
No new decisions, no new code — read-only state of the branch.

---

## 1. Branch / Status

| Field | Value |
|-------|-------|
| Branch | `feature/ocr-api-integration` |
| Last commit | `40d402cb2` — `fix(layout): replace hardcoded safe-area padding leftovers` |
| Working tree | `docs/BRIEFPILOT_MRT.md` modified (unsaved MRT note), nothing else staged |
| iOS project | `ios/BriefPilot.xcodeproj/project.pbxproj` — modified (native dependency rebuild from react-native-pdf) |
| Build script | `build_device.sh` — untracked, device build helper, not committed intentionally |

**Note on `project.pbxproj`:** This file changed during the `react-native-pdf` native rebuild (`npx expo run:ios --device`). It reflects the peer dependency `react-native-blob-util ^0.24.9` being linked. It should be committed before any TestFlight prep so CI builds the correct native target.

---

## 2. Core Flows — Status

| Flow | Status | Notes |
|------|--------|-------|
| PDF upload → analyse → save → open fullscreen | ✅ PASS | `react-native-pdf` in-app render; X/Share safe area verified |
| Camera scan → save → Dokument tab | ✅ PASS | `finishScanFlow` routes to `tab: 'ozet'` |
| Preview card tap → fullscreen viewer | ✅ PASS | `DocumentPagesViewer`; `DocumentMagnifier` zoom in image branch |
| X / Share buttons in fullscreen — safe area | ✅ PASS | `ViewerTopBar` normal flow, `paddingTop: insets.top` |
| Gutschrift document → no Zahlung CTA | ✅ PASS | `canOfferPaymentAction(betrag)` guard in all action surfaces |
| OCR result CTA hierarchy | ✅ PASS | "In Dokumente speichern" primary; Excel/Download secondary outlined |
| Single document export | ✅ PASS | `exportiereTopluPDF` via share sheet |
| Batch export (selectedIds) | ⬜ Device not yet confirmed | Logic correct; `c3793a6` OR-bug fixed; needs device smoke |
| Excel V7 backend download | ✅ PASS | `GET /documents/{job_id}/download`; V7 schema 31/31 tests PASS |
| Vorlesen (native TTS) | ⬜ Not verified this session | `expo-speech` wired; no regression reported |
| Delete / Undo | ⬜ Not verified this session | Logic exists; no smoke this sprint |

---

## 3. Professional UI Reset — Completed

All items below are committed and in the current branch.

| Item | Commit |
|------|--------|
| OCR result screen production copy ("Dokument wird analysiert", "Neue Analyse") | `b919b6e` |
| HomeTriage zero counters hidden | `821532cb2` |
| Home duplicate all-clear message removed | `2ecf63ac2` |
| Ähnliche Dokumente noise removed | `1f86909d2` |
| Überblick duplicate footer removed (AnalyseHeaderCard) | `a7c50f8f5` |
| Erledigen tab duplicate next-step card removed | `5f86e8009` |
| SmartActionsPanel collapsed by default | `54b9760` |
| Erledigt pill moved out of quick pills → MoreMenu | `54b9760` |
| Home emoji removed → Phosphor icons | `d6ce83b` |
| Technical OCR/KI/Server wording cleaned (V4JobStatusRibbon, DocumentAnalysisProgressCard, ActionsPanel, SmartSummaryCard, BelgeAciklamaModal, AutoFillReviewModal, useDetailMoreItems) | `060fec3`, `5106c25`, `994db2b` |
| OCR download button demoted to secondary outlined | `5663b6a` |
| Layout / safe-area hardcoded values replaced with dynamic calculations | `40d402cb` |

---

## 4. Excel Export State

- **Backend:** V7 accepted as Steuerberater-readable V1. Schema: `invoice_to_excel.py` + `schema.py` v7. 31/31 unit tests PASS.
- **Endpoint:** `GET /documents/{job_id}/download` — unchanged.
- **Label:** "Excel für Steuerberater herunterladen" in OCR result screen.
- **Not DATEV:** No DATEV/EXTF implementation. `ENABLE_RELEASE_DATEV_EXPORT = false`. This label must never appear in UI.
- **Not Accountable-compatible:** Not tested; this claim must not be made.
- **Detail export sheet:** Does NOT offer Excel. `Dokument` type has no `ocrJobId`/`xlsxPath` field. Backend TTL unknown. `GET /documents/{job_id}/download` has no callable job_id from the detail screen.
- **Future backlog:**
  - `feat(export): persist ocrJobId on saved Dokument` — type + adapter + TTL decision
  - or: `backend endpoint: regenerate Excel from saved document id` — separate sprint

---

## 5. Known Non-Blockers / Backlog

These are confirmed non-blocking for release. Do not fix before snapshot review.

| Item | Priority | Notes |
|------|----------|-------|
| Button System AppButton migration | P3 | Wide surface, risky. Deferred explicitly. |
| SmartRiskPanel expanded factors — emoji still used | P3 | Only in expanded (collapsed by default). |
| ExportBildschirm inline comments cleanup | P3 | Cosmetic only. |
| DATEV EXTF export | Future | `ENABLE_RELEASE_DATEV_EXPORT` flag gates it. |
| PDF split/merge UI | Future | Infrastructure exists, no UI. |
| Cloud voice note → transcript | Future | Not started. |
| Localization deeper i18n audit | Future | Türkçe/Almanca string mix exists; not P1. |
| Home `DashboardSummary` / `HomeUrgencyBanner` visual overlap | Optional | No crash, no data loss. |
| Detail Excel download (requires job_id persistence) | Backlog | See §4. |
| `ios/project.pbxproj` commit | Pre-TestFlight | Must be committed before CI build. |
| `build_device.sh` gitignore or commit decision | Pre-TestFlight | Contains local paths; review before committing. |

---

## 6. Test State

### TypeScript

- **20 pre-existing errors** — all `TS2769 No overload` in `ActionsPanel.tsx`, `SmartSummaryCard.tsx`, `AnalyseHeaderCard.tsx`, `SectionCard.tsx`; `TS2322` in `CameraView.tsx`; `TS2305`/`TS2554` in `CameraEngine.ts`.
- None introduced by this sprint. Baseline confirmed by stash/unstash comparison.
- Runtime not affected.

### Device Smoke

| Test | Status |
|------|--------|
| PDF fullscreen viewer | ✅ Verified |
| Scan → Dokument tab | ✅ Verified |
| OCR save → Dokument tab | ✅ Verified |
| Gutschrift no-Zahlung | ✅ Verified |
| OCR Excel download | ✅ Verified |
| Batch export (selectedIds) | ⬜ Not confirmed this sprint |
| Export bottom padding (last item above CTA) | ⬜ Not confirmed this sprint |
| Vorlesen | ⬜ Not confirmed this sprint |
| Delete / Undo | ⬜ Not confirmed this sprint |

### Automated Tests

- Excel V7: **31/31 PASS** (RunPod, Python unit tests on `invoice_to_excel.py`)
- No Jest / Detox suite present in mobile repo.

---

## 7. Next Recommended Steps

**No new feature or P3 fix before this snapshot is reviewed.**

Recommended order:

1. **Commit `project.pbxproj`** — native dependency change must be in version control before any CI/TestFlight build.
2. **Short device smoke** — focus on the four ⬜ items above (batch export, export padding, Vorlesen, Delete/Undo). If any is a blocker, fix it. If all pass, mark ✅.
3. **TestFlight prep** — increment build number, run `eas build --platform ios --profile preview` or equivalent, submit internal build.
4. **P3 polish** — only after TestFlight build confirms no regression.

**No known P0 blocker as of 2026-05-28.**

---

*Generated at end of Professional UI Reset sprint. Next review: after device smoke or TestFlight build.*
