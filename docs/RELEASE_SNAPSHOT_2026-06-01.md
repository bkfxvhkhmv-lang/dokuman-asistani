# Release Readiness Snapshot — 2026-06-01

**Purpose:** Incremental update over 2026-05-28 snapshot.
Reflects all commits from `edd2c6f37` through `10574bf57`.
No new decisions, no new code — read-only state of the branch.

---

## 0. BriefPilot Product Core

BriefPilot is not a generic OCR app or PDF toolbox.
The core product is a **document assistant for German letters, invoices and everyday paperwork**.

**Core jobs:** understand letters · identify next action · draft replies · classify invoices · store and find documents · prepare expenses for tax/accountant · help users with limited German

**Primary audiences:** private individuals · immigrants / limited German · small businesses · freelancers · people preparing for tax time

**Not:** a full accounting system · property management · generic chatbot · generic PDF editor · OCR benchmark

**Feature priority:** understand · reply · classify · store · search · export for Steuerberater

**Key decisions for this build:**
- Antwort schreiben = core feature
- Ausgaben-Übersicht = core feature
- Excel/PDF export for Steuerberater = strategically important
- Angaben bearbeiten = core (field correction, not full OCR text editing)
- Overflow menus removed in favour of visible, clear inline actions

---

## 1. Branch / Status

| Field | Value |
|-------|-------|
| Branch | `feature/ocr-api-integration` |
| Last commit | `10574bf57` — `fix(home): hide tab bar during document selection, fix selection bar position` |
| Working tree | clean |
| TypeScript | `npx tsc --noEmit` → 0 errors (baseline pre-existing errors unchanged) |

---

## 2. Sprint Commits — 2026-05-28 → 2026-06-01

| Commit | Summary | Status |
|--------|---------|--------|
| `edd2c6f37` | fix(sheet): remove BlurView; delay modal open after MoreMenu close | ✅ PASS |
| `2911926aa` | fix(detail): render more tools inline, remove MoreMenuSheet | ✅ PASS |
| `b934fc171` | fix(detail): reorder inline tools per product priority | ✅ PASS |
| `d959bd3fe` | fix(detail): remove generic help and anonymization tool actions | ✅ PASS |
| `9edc90b19` | feat(detail): simplify tools and add expense overview modes | ✅ PASS |
| `24318f8e4` | fix(detail): disable unsafe signature flow | ✅ PASS |
| `3ed522962` | feat(detail): add real PDF signature placement | ✅ PASS– |
| `6d869a6bc` | fix(signature): fix drag freeze and improve pad usability | ✅ PASS– |
| `896c36691` | fix(detail): park PDF signing — interaction quality insufficient | (rev'd in 16a60ea59) |
| `16a60ea59` | fix(signature): improve gesture reliability and re-enable feature | ✅ PASS– |
| `652c60106` | feat(signature): add signature rotation for landscape/rotated PDFs | ✅ PASS– |
| `c787d9e34` | fix(signature): rotate frame and image together | ✅ PASS– |
| `aa5333c9e` | fix(signature): save PDF locally, sharing is optional | ✅ PASS– |
| `71c3a0ead` | feat(signature): save signed PDF to document, add revert option | ✅ PASS– |
| `aaaa4eea0` | fix(detail): improve inline tools hierarchy with sections | ✅ PASS |
| `d0f5007f2` | fix: reduce false-positive review hints, clean speech section labels | ✅ PASS |
| `340737f73` | fix(detail): remove duplicate overflow menu from header | ✅ PASS |
| `0b7091023` | fix(detail): polish detail typography and action layout | ✅ PASS |
| `43a12dc70` | fix(home): hide tab bar during document selection (superseded) | — |
| `10574bf57` | fix(home): hide tab bar during document selection, fix selection bar position | ✅ PASS |

---

## 3. Feature Status — Full Picture

### 3a. Core Flows (carried forward from 2026-05-28)

| Flow | Status |
|------|--------|
| PDF upload → analyse → save → open fullscreen | ✅ PASS |
| Camera scan → save → Dokument tab | ✅ PASS |
| Preview card tap → fullscreen viewer | ✅ PASS |
| Gutschrift document → no Zahlung CTA | ✅ PASS |
| OCR result CTA hierarchy | ✅ PASS |
| Single document export | ✅ PASS |
| Batch export (selectedIds) | ✅ PASS |
| Excel V7 backend download | ✅ PASS |
| Vorlesen (native TTS) | ✅ PASS |
| Vorlesen locale selection | ✅ PASS |
| Search (Alle / category chips / single-char trigger) | ✅ PASS |
| Delete / Undo | ✅ PASS (device verified this sprint) |

### 3b. This Sprint — New / Changed

| Feature | Status | Notes |
|---------|--------|-------|
| Detail Erledigen inline tools (Weitere Aktionen sections) | ✅ PASS | Teilen/Bearbeiten/Abschließen sections; Exportieren mavi; Löschen kırmızı ayrışık |
| Detail top-right `...` menu | ✅ REMOVED | Duplicated inline actions + AppSheet risk → kaldırıldı; `MoreMenuSheet` gone |
| PDF signature v1 | ✅ PASS– | Draw/place/save çalışıyor; rotate fix landed; UX premium değil; deferred polish |
| Offene Hinweise count | ✅ PASS | `invoiceLike` daraltıldı (steuer/beitrag çıkarıldı); low_confidence threshold 30→15 |
| Erfasst am → Prüfen badge | ✅ FIXED | Hardcoded `status:'pruefen'` kaldırıldı; scan tarihi kullanıcı onayı gerektirmez |
| Vorlesen section labels | ✅ PASS | VORLESEN → Vorlesen; 🔊/⏹ emoji kaldırıldı; critical button'a microphone icon eklendi |
| `1: Monat zum Laufzeitende` colon bug | ✅ FIXED | `labels.ts` extraction sanitize: `(\d+):\s*` → `$1 ` |
| Home selection bar overlap | ✅ PASS | `TAB_BAR_CLEARANCE 78→12`; `setTabBarHidden(secilenModus)` zaten wired; list padding adjusted |
| NÄCHSTER SCHRITT all-caps header | Still present | `NaechsterSchrittCard` still uses all-caps; deferred |
| HUK sender extraction | ⚠️ Partial | Amount (246,18 €) ✅ fixed; sender (DIE ONLINE-VERSICHERUNG vs HUK24) still incorrect; date needs verification |

---

## 4. Health Path — Backend / Frontend Alignment

**Frontend calls two health endpoints:**

| Component | URL | Status |
|-----------|-----|--------|
| `BackendHealthBootstrap.tsx` | `https://api.briefpilot.de/api/v4/health/` | Dev log uyarısı görüldü: `Reachability check failed` — backend bu path'i sunmuyor olabilir |
| `OcrMvpScreen.tsx` | `https://api.briefpilot.app/health` | Ayrı OCR backend; ayrı değerlendirme |

**Frontend'de değiştirilecek bir şey yok.** `BackendHealthBootstrap` yalnızca `__DEV__` modda `console.warn` üretiyor, prod'da sessiz kalıyor. Preflight (OCR akışı) PASS ise release blocker değil. Backend'in `/api/v4/health/` endpoint'i açması veya `BackendHealthBootstrap`'ın URL'ini güncellemesi için backend tarafında karar gerekiyor.

---

## 5. HUK Sender/Date — Remaining Extraction Gap

**Amount:** ✅ `246,18 €` doğru çekiliyor (commit `d0f5007f2` ile `invoiceLike` fix)

**Sender:** ⚠️ OCR `DIE ONLINE-VERSICHERUNG` döndürüyor, `HUK24` / `HUK24 AG` bekleniyor.
- Bu extraction/classification layer meselesi; regex-based sender normalization veya V6 model iyileştirmesi gerektirir.
- Dar fix: `src/utils/labels.ts` veya `src/services/smart-categorization/` içine HUK24 → normalized sender mapping eklenebilir.
- Karar: TestFlight öncesi blocker değil, ancak "güven kırıcı" kategorisi. Sprint 2'ye bırakıldı.

**Date:** `dok.dokumentDatum` vs `dok.datum` ayrımı hâlâ doğrulanmadı. `Erfasst am` badge fix'i (`d0f5007f2`) uygulandı; scan tarihi artık "Prüfen" işareti almıyor.

---

## 6. Known Non-Blockers / Backlog (Güncellenmiş)

| Item | Priority | Notes |
|------|----------|-------|
| PDF signing UX polish (smoother draw/drag/resize) | P2 | v1 çalışıyor (PASS–); TestFlight'ta beta feedback bekleniyor |
| NÄCHSTER SCHRITT all-caps → sentence-case | P3 | `NaechsterSchrittCard.tsx:52` — cosmetic |
| HUK sender normalization | P2 | Sprint 2; TestFlight için blocker değil |
| Backend health endpoint alignment | Backend | `api.briefpilot.de/api/v4/health/` 404 ise backend kararı |
| Button System AppButton migration | P3 | Wide surface, risky. Deferred. |
| DATEV EXTF export | Future | `ENABLE_RELEASE_DATEV_EXPORT = false` |
| PDF split/merge UI | Future | Infrastructure only |
| Regelmarkt / Automationen | Hidden | `ENABLE_RELEASE_*` flag gates |
| Excel from saved Dokument | Backlog | Requires `ocrJobId` persistence on `Dokument` type |

---

## 7. Release Blockers — Current State

| Blocker | Status |
|---------|--------|
| TypeScript errors (new) | ✅ None introduced |
| App crash on launch | ✅ No known crashes |
| Camera permission denial — no exit path | ✅ Handled |
| Scan → infinite processing | ✅ Resolved (preflight + backend) |
| Detail Analyse tab empty | ✅ Renders |
| Aktionen tab — no primary action | ✅ Renders |
| Home selection bar overlapping tab bar | ✅ Fixed `10574bf57` |
| Mehr sheet broken (AppSheet race) | ✅ Removed — inline only |
| Payment flow native alert | ✅ Fixed (prior sprint) |

**No known release blockers as of 2026-06-01.**

---

## 8. Next Steps

1. **MRT güncellemesi** — bu dosya ✅
2. **`preflight_all` çalıştır** — OCR backend reachability son doğrulama
3. **TestFlight build** — `eas build --platform ios --profile testflight`
4. **Sprint 2 backlog** — HUK sender, PDF signing polish, health path, Steuerberater Export v2

---

## 9. Steuerberater Export v2 — Backlog (High Value, Next Sprint)

**Not a TestFlight blocker. Do not implement before current build.**
**Updated 2026-06-01: backend v7 pipeline found — preferred path is backend-side, not client-side.**

### Why this matters

Current `Steuerpaket` exports a single merged PDF. That is useful but not what a tax advisor actually needs: they receive one unstructured file and must split it manually. The real value is a structured package with individual per-document Excel files and a summary manifest.

### Backend infrastructure — more than expected

Inspected `briefpilot_ocr_mvp/` and found the following already exists:

| Component | Status | Location |
|-----------|--------|----------|
| `InvoiceResult` schema v7 | ✅ deployed | `schema.py` |
| `invoice_to_excel.py` v7 | ✅ deployed | `modules/invoice_to_excel.py` |
| `test_excel_v7.py` | ✅ 31/31 PASS | root |
| `GET /documents/{job_id}/download` | ✅ works | `api/main.py:513` |
| Yearly ZIP endpoint | ❌ missing | — |
| Cross-document summary CSV | ❌ missing | — |

**v7 Excel Sheet 1 already produces 20 fields:**
Quelldatei · Lieferant · Rechnungsnummer · Belegdatum · Fälligkeit · Kundenname · Kundennummer · Vertragsnummer · Aktenzeichen · Nettobetrag · Umsatzsteuer · Steuersatz · Bruttobetrag · Zahlungsrichtung · Belegart · Währung · IBAN · Kategorie · Dokument-ID · Hinweise

These include calculated fields (Netto/VAT/Brutto, Zahlungsrichtung, Belegart) that mobile-side CSV cannot produce. **Backend path is clearly stronger.**

### Decision: prefer backend-side v2, not client-side CSV

~~Mobile-side CSV (expo-file-system + JS zip)~~ — possible but inferior.
**Preferred path: backend yearly ZIP endpoint reusing existing v7 generator.**

### Target output (v2)

```
BriefPilot_Steuer_2026.zip
  /Excel/
    2026-03-01_HUK24_246-18.xlsx      ← v7 generator, already works per-doc
    2026-04-15_Finanzamt_340-00.xlsx
  summary.csv                          ← one row per document, cross-doc aggregate
  README.txt
```

Optional v2b (if source PDFs available on backend):
```
  /Belege_PDF/
    2026-03-01_HUK24_246-18.pdf
```

### New backend endpoint needed

```
GET /steuerpaket?year=2026
→ 200 application/zip
   Content-Disposition: attachment; filename="BriefPilot_Steuer_2026.zip"
```

Work involved: orchestration only — iterate job_ids for year → call existing v7 generator per doc → bundle ZIP + summary CSV. No new schema work needed.

### Versioning plan

| Version | Scope | Notes |
|---------|-------|-------|
| v2a | Backend ZIP: `/Excel/*.xlsx` + `summary.csv` + `README` | Reuses v7, orchestration only |
| v2b | Add `/Belege_PDF/*.pdf` if source files accessible on backend | |
| v2c | DATEV / Beleglink research | Separate decision, separate sprint |

### Product copy

> **Für Steuerberater vorbereiten**
> Excel-Übersicht und Belege als ZIP exportieren

Do not use "DATEV-kompatibel" until DATEV format is built.

### What mobile side needs to do for v2a

1. New "Steuerberater-Paket herunterladen" button in `ExportBildschirm`
2. Call `GET /steuerpaket?year=YYYY` → download ZIP → `expo-sharing`
3. Mobile does NOT need to generate CSV or ZIP — backend handles it

Do not use "DATEV-kompatibel" until a real DATEV format is implemented.

---

*Updated 2026-06-01 — Sprint covering MoreMenu removal, PDF signing v1, Erledigen inline tools, UI polish commits, home selection bar fix.*
