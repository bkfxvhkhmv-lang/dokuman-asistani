# Release Readiness Snapshot — 2026-05-28

**Purpose:** Point-in-time summary of what is done, what is not, and what comes next.
No new decisions, no new code — read-only state of the branch.

---

## 1. Branch / Status

| Field | Value |
|-------|-------|
| Branch | `feature/ocr-api-integration` |
| Last commit | `pending current commit` — `fix(display): sanitize budget detail document titles` |
| Working tree | clean |
| iOS project | `ios/BriefPilot.xcodeproj/project.pbxproj` — committed `0651e5728` |
| Build script | `build_device.sh` — `.gitignore`'da (`03ed08406`) |

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
| Batch export (selectedIds) | ✅ PASS — title decode re-verify pending | Logic PASS device smoke; URL-encoded titles fixed `3fb9f127`; re-export needed to confirm decode |
| Remaining raw title UI surfaces | ✅ Code fix landed — device verify pending | SmartLinksPanel, SmartTimelinePanel, PdfMergeDragModal, DocumentContextSheet, DocumentAnalysisProgressCard, ContextualGuidance now sanitize display titles via central helper |
| Excel V7 backend download | ✅ PASS | `GET /documents/{job_id}/download`; V7 schema 31/31 tests PASS |
| Vorlesen (native TTS) | ✅ Wiring fix landed — device verify pending | `DocumentSpeechSection` now belongs to the normal detail user flow; source-independent, text-dependent |
| Regelmarkt / Automationen | ✅ Hidden in production — backend pending | Route may remain, but production settings no longer expose unfinished marketplace copy |
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
| Regelmarkt / Automationen | Hidden backlog | Backend endpoint still missing; production UI entry should stay hidden until service is available. |
| Cloud voice note → transcript | Future | Not started. |
| Localization deeper i18n audit | Future | Türkçe/Almanca string mix exists; not P1. |
| Home `DashboardSummary` / `HomeUrgencyBanner` visual overlap | Optional | No crash, no data loss. |
| Detail Excel download (requires job_id persistence) | Backlog | See §4. |
| Remaining raw title surfaces — P1-A Messages | ✅ Done | `calendar.ts`, `notifyContent.ts`, `SmartRemindersService.ts`, `WidgetDataService.ts` now sanitize display titles |
| Remaining raw title surfaces — P1-B Share/Export | ✅ Done | `exporters.ts`, `document-actions/sharing.ts`, `documentActionFlows.ts`, `SignaturePdfSheet.tsx` now sanitize display titles |
| Remaining raw title surfaces — P1-C Summaries/Guidance | ✅ Done | `MultiLayerSummaryView.tsx`, `SmartRegionsView.tsx`, `labels.ts`, `homeSuggestions.ts`, `AutoWorkflowEngine.ts`, `documentAnalysis.ts` now sanitize display titles |
| Remaining raw title surfaces — Budget detail | ✅ Done | `SeciliAyDetay.tsx` now uses sanitized display title fallback |
| ~~`ios/project.pbxproj` commit~~ | ~~Pre-TestFlight~~ | ✅ Done `0651e5728` |
| ~~`build_device.sh` gitignore~~  | ~~Pre-TestFlight~~ | ✅ Done `03ed08406` |

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
| Batch export (selectedIds) | ✅ Logic PASS | 2-doc batch confirmed on device; URL title decode fix `3fb9f127`; re-export to confirm decoded display |
| Export bottom padding (last item above CTA) | ⬜ Not confirmed |  |
| Vorlesen | ✅ Wiring fix landed — rebuild verify pending | OCR/rohText or page OCR text should now surface Vorlesen in the normal detail flow |
| Delete / Undo | ⬜ Not confirmed |  |

### Automated Tests

- Excel V7: **31/31 PASS** (RunPod, Python unit tests on `invoice_to_excel.py`)
- `safeDisplayDocumentTitleForExport`: **8/8 PASS** (Jest, `src/__tests__/exportDocumentTitle.test.ts`)
- `displaySanitizer` + export title tests: **18/18 PASS** (`src/__tests__/displaySanitizer.test.ts`, `src/__tests__/exportDocumentTitle.test.ts`)
- No Detox suite present in mobile repo.

---

## 7. Next Recommended Steps

**No new feature or P3 fix before this snapshot is reviewed.**

Recommended order:

1. ~~`project.pbxproj` commit~~ ✅ `0651e5728`
2. ~~`.gitignore` for `build_device.sh`~~ ✅ `03ed08406`
3. ~~Source file persistence (cacheDirectory bug)~~ ✅ `2092164c` + `fee62528`
4. ~~Title sanitizer (Steuer%20, Bis, Angaben prüfen)~~ ✅ `baec9ae1`
5. ~~Search Alle boş liste~~ ✅ `f5a24dd4`
6. **Rebuild + clean state smoke** — reset via DEV button, upload fresh docs, run checklist below.
7. **Rebuild + broad smoke** — verify Search, Share/Export, Notifications/Widget/Calendar, Summary/Guidance, Budget detail on device.
8. **TestFlight prep** — after smoke PASS.

**Vorlesen note:**
- Fixed as render-placement bug, not OCR-source limitation.
- Product rule: if `rohText` or `pages[].ocrText` exists, Vorlesen should be visible in the normal detail flow.
- PDF upload without extracted text still needs a future unavailable-state or text extraction improvement.

**Completed after snapshot:**
- Source file persistence → `relativePath` model (`fee62528`, `2092164c`)
- Title decode / timeline labels → `baec9ae1`
- Search Alle behavior → `495c55a1`, `f5a24dd4`
- 3 main search groups → `18a8d1e0`
- Search copy (V4/Semantik) → `32c12055`
- Search visual density → P2 backlog, TestFlight blocker değil

**Remaining smoke checklist (clean state required):**

| # | Test | Beklenen |
|---|------|---------|
| 1 | Einstellungen → DEV reset | Tüm belgeler silinir |
| 2 | PDF/JPEG upload → kaydet | Dokument sekmesinde preview görünür |
| 3 | Kamera scan → kaydet | Dokument sekmesinde preview görünür |
| 4 | App yeniden başlat → belge aç | Preview hâlâ görünür (relativePath fix) |
| 5 | Search → Alle chip | Belge listesi görünür, boş değil |
| 6 | Search → Rechnungen chip | Sadece Rechnung tipi belgeler |
| 7 | Search → 1 karakter yaz | Arama başlar |
| 8 | Fristen & Termine | "Bis" başlık olarak görünmez |
| 9 | Herhangi belge başlığı | `%20` encoded karakter yok |
| 10 | Herhangi belge başlığı | "Angaben prüfen" başlık olarak yok |
| 11 | App restart → belge aç → Dokument tab | Preview hâlâ görünür (relativePath) |
| 12 | Vorlesen — analizli belgede | Ses başlar, Anhalten çalışır |
| 13 | Fristen & Termine yeni build | "Bis" başlık yok, "Steuer%20..." yok |
| 14 | SmartLinks/Timeline/Merge/Context/Progress/Guidance | Encoded or placeholder raw title görünmez |

**Sonuç formatı:**
```
Search Alle:             PASS/FAIL
Category chip:           PASS/FAIL
Encoded title:           PASS/FAIL
Bis label:               PASS/FAIL
Angaben prüfen as title: PASS/FAIL
Preview persistence:     PASS/FAIL
Notlar:
```

---

*Updated 2026-05-28 evening — P1-A, P1-B, P1-C and budget detail cleanup landed. Remaining raw title debt should now be limited to non-user-visible data paths. Next: rebuild and broad smoke verification.*
