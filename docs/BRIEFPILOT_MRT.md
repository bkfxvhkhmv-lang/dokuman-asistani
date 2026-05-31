# BriefPilot MRT — Master Reference & Tracker

**Protokol:** Her yeni oturumda bu dosyayı önce oku. Kod yazmadan önce buraya bak. Her commit sonrası güncelle.

---

## 0. BriefPilot Product Core

BriefPilot is not a generic OCR app or PDF toolbox.
The core product is a document assistant for German letters, invoices and everyday paperwork.

### Core jobs

| # | Job |
|---|-----|
| 1 | Understand German official/private letters |
| 2 | Identify what the user needs to do next |
| 3 | Draft German replies when a response is needed |
| 4 | Classify invoices and payment-related documents |
| 5 | Store documents so they can be found later |
| 6 | Prepare expenses for tax/accountant workflows through summaries and export |
| 7 | Help users with limited German understand letters without panic |

### Primary audiences

- Private individuals
- Immigrants / users with limited German
- Small businesses
- Freelancers
- People who want receipts/invoices ready for tax time

### Product boundaries — what BriefPilot is NOT

- Not a full accounting system
- Not property management software
- Not a generic chatbot
- Not a generic PDF editor
- Not an OCR benchmark/demo
- PDF signing is useful only as part of document response/form workflows

### Feature priority filter

Keep or prioritize features that support: **understand · reply · classify · store · search · export for tax/accountant**

Avoid features that create generic tool clutter without helping those jobs.

### Decision impact

| Feature | Status |
|---------|--------|
| Antwort schreiben | ✅ Core |
| Ausgaben-Übersicht | ✅ Core |
| Excel/PDF export for Steuerberater | ✅ Strategically important |
| Angaben bearbeiten | ✅ Core — users correct important fields, not full OCR text |
| Hilfe & Beratung / generic chat | ⚠️ Only if tied to the document |
| More/overflow menus | ❌ Avoid — actions should be visible and clear |

---

## 1. Amaç & Protokol

Bu dosya BriefPilot iOS uygulamasının:
- Temel kullanım akışlarını (what must work)
- Mimari kararları (why it works this way)
- Son commit tarihçesini (what was fixed)
- Açık P0/P1 sorunları (what's broken)
- Kod yazmadan önce uyulması gereken kuralları

tek yerde tutar.

**Her oturum başı zorunlu adım:**
1. `docs/BRIEFPILOT_MRT.md` oku
2. Mevcut durumu ve bir sonraki doğru adımı söyle
3. Kullanıcı onayı olmadan kod yazma

**Her commit sonrası zorunlu adım:**
- Bölüm 5 (Commit Log) ve Bölüm 6 (Açık Sorunlar) güncelle

---

## 2. Ürün Prensipleri

- **Ciddi belge uygulaması.** Oyuncak değil. Her UI kararı "bir banka müşterisi bunu kullanabilir mi?" sorusuna göre verilir.
- **Core UI'da emoji yok.** SmartFolders, HotCards, ActionStrip gibi core bileşenlerde sadece Phosphor icon + renk token kullanılır. Onboarding / pazarlama alanları ayrı karar.
- **PDF birincil dosya türüdür.** Uygulama in-app PDF render eder; kullanıcıyı başka uygulamaya yönlendiremez.
- **Gutschrift (negatif tutar) asla Zahlung aksiyonu üretmez.** `canOfferPaymentAction(dok.betrag)` guard her zaman uygulanır.
- **Dokunma alanı ≥ 44×44pt.** Her `TouchableOpacity` için `hitSlop` veya `padding ≥ 12`.
- **Yanlış bilgi hiç bilgiden kötüdür.** Confidence < 55 ise alanlar `'Unbekannt'` gösterir, uydurma değil.
- **Koda bakarak proaktif hata bul.** Kullanıcı test etmeden önce akış okunur; olası sorunlar bildirilir.
- **Ham belge başlığı UI'a basılmaz.** `dok.titel` / `d.titel` / `item.titel` kullanıcıya görünen yüzeylerde doğrudan render edilmez; merkezi display sanitizer kullanılır.

---

## 3. Temel Kullanım Akışları (ne çalışmalı)

### 3.1 PDF Upload → Tam Ekran
- Kullanıcı PDF yükler → Detay ekranında önizleme kartı görünür
- Ön izleme kartına dokun → `DocumentPagesViewer` modal açılır
- PDF `react-native-pdf` ile in-app render edilir (share sheet değil)
- X ve Share butonları Dynamic Island'ın altında, güvenli alanda durur
- İçerik (PDF) header'ın altından başlar (absolute değil, normal akış)

### 3.2 Scan → Tam Ekran
- Kamera ile tarama → Analiz → Kaydet → `scanNavigate.ts::finishScanFlow`
- `router.replace('/detail', { dokId, tab: 'ozet' })` — Dokument sekmesi açılır, Analyse değil
- Önizleme resmine dokun → `DocumentPagesViewer` açılır
- Image branch: `DocumentMagnifier` ile zoom (fullscreen içinde)

### 3.3 OCR MVP → Dokument Aç
- OCR tamamlanır → "Speichern" → "Dokument öffnen" butonu
- `router.push('/detail', { dokId, tab: 'ozet' })` — Dokument sekmesi açılır
- `OcrMvpScreen.tsx::handleOpenDocument`

### 3.4 Export Akışı
- Tek belge: Detay → paylaş → ExportBildschirm
- Toplu: Liste → seç → Exportieren → ExportBildschirm (selectedIds param)
- Son öğeler CTA'nın üstünde görünür: `paddingBottom = tabBarHeight + insets.bottom + 80`

### 3.5 Gutschrift (Negatif Tutar) Akışı
- `dok.betrag < 0` → `inferPrimaryKey` → `'gutschrift'` döner
- `buildPressMap.gutschrift = handlers.onEdit` (Angaben prüfen)
- Zahlung menü öğesi hiç gösterilmez
- `canOfferPaymentAction(betrag)` false döner → tüm ödeme CTAları gizlenir

### 3.6 Frist & Kalender Akışı
- `shouldShowDetailDeadlineBanner(dok)` true ise → Kalender butonu gösterilmez (banner zaten gösteriyor)
- Kalender yerine başka aksiyon (Zahlen/Einspruch/Mail) gösterilir

---

## 4. Mimari Kararlar

### 4.1 PDF Viewer
```
react-native-pdf (Pdf component)
  peer dep: react-native-blob-util ^0.24.9
  native rebuild gerekli: npx expo run:ios --device
```
- `ViewerPageSlide.tsx`: PDF branch → `<Pdf>`, Image branch → `<Image>` + `DocumentMagnifier`
- Hata durumunda fallback: "PDF extern öffnen" → `Sharing.shareAsync(uri)`

### 4.2 Fullscreen Viewer Shell
```
DocumentPagesViewer.tsx
  └── ViewerTopBar (normal flow, NOT absolute)
       ├── topBarSafeWrapper: { paddingTop: insets.top, backgroundColor: rgba(0,0,0,0.88) }
       └── topBar: { height: 56, paddingHorizontal: 16, flexDirection: 'row' }
  └── <View style={{ flex: 1 }} onLayout → contentHeight>
       └── ScrollView (PDF/image content)
       └── ThumbStrip (≥2 sayfa)
```
- Neden: `position: absolute` → içerik header altında render oluyordu
- `useSafeAreaInsets()` ViewerTopBar içinde kullanılır, prop olarak geçilmez

### 4.3 canOfferPaymentAction Guard
```ts
// src/utils/documentGuards.ts
export function canOfferPaymentAction(betrag: number | null | undefined): boolean {
  if (betrag == null) return true;
  return betrag > 0;
}
```
Her payment action noktasında çağrılır: `inferPrimaryKey`, `getDetailActionPlan`, MoreMenu item builder.

### 4.4 Tab Parametresi
```ts
// useDetailBildschirmLogic.ts
const { dokId: dokIdParam, tab: tabParam } = useLocalSearchParams<...>();
useDetailScreenAnimations(tabParam ?? 'analiz');
```
Tab ID'leri: `'analiz'` (Analyse), `'ozet'` (Dokument), `'eylem'` (Aktionen)

### 4.5 StickyBottomCTA
```tsx
// design/components/StickyBottomCTA.tsx
// Güvenli alan padding = tabBarHeight + insets.bottom + 80
```
`useBottomTabBarHeight()` sadece görsel bar yüksekliğini verir, home indicator dahil değil.
`insets.bottom` home indicator + safe area verir.

### 4.6 DocumentMagnifier & PanResponder
- `DocumentMagnifier` sadece `ViewerPageSlide` içinde (fullscreen image) kullanılır
- `DocumentPreviewSection` (önizleme kartı) içinde kullanılmaz — `onStartShouldSetPanResponder: () => true` tüm dokunmaları tüketiyordu

### 4.7 Excel Export — Mimari Karar (2026-05-28)

**Durum:** Excel V7 backend-side accepted as Steuerberater-readable V1.

```
Endpoint:  GET /documents/{job_id}/download  ← değişmedi
Generator: briefpilot_ocr_mvp/modules/invoice_to_excel.py (v7)
Schema:    briefpilot_ocr_mvp/schema.py (v7)
Mobile:    Excel ÜRETMİYOR — sadece download ediyor
```

**V7 düzeltmeleri (commit `4f796c4`):**
- Belegdatum: DD.MM.YYYY normalize (Almanca ay adları dahil)
- Gutschrift: negatif tutar → mutlak değer + Zahlungsrichtung=Einnahme + Belegart=Gutschrift
- Yeni alanlar: Steuersatz, Kategorie, Kundennummer, Vertragsnummer, Fälligkeit, IBAN
- Pozisyon sayfası: tekrarlayan boş toplam satırları temizlendi, tek SUM formülü
- Rohdaten: ABBYY xlsx kopyası yerine düz OCR metin dump (opsiyonel sheet)

**Kesin HAYIR — bu etiketler hiçbir yerde kullanılmaz:**
- `DATEV Export` — DATEV/EXTF implementasyonu yok, ayrı sprint gerektirir
- `Accountable-kompatibel` — test edilmedi, resmi uyumluluk beyan edilemez

**Önerilen UI label:**
- `Excel für Steuerberater herunterladen` (OCR Result ekranı)
- Sublabel: Belegdatum, Lieferant, Beträge, Kategorie alanlarını içerir

**Excel erişilebilirlik kararı (2026-05-28):**
```
Excel download = SADECE OCR Result ekranında, job canlıyken.
Detail ExportierenSheet'e Excel eklenmez — veri yok.
```
- `OcrMvpJobStatus.job_id` ve `output_path` kayıtlı `Dokument`'a yazılmıyor
- `Dokument` tipinde `ocrJobId` / `xlsxPath` alanı yok
- Detail ekranında `GET /documents/{job_id}/download` için gereken bilgi yok
- Backend TTL politikası bilinmiyor; persist edilse bile link expire edebilir

Detail `ExportierenSheet` seçenekleri kalıcı olarak: PDF / Originaldatei / Text / Sicherer Link.

**Backlog — Excel'i detail'e taşımak istersen:**
- `feat(export): persist ocrJobId on saved Dokument` — tip + adapter + TTL kararı
- veya: `backend endpoint: regenerate Excel from saved document id` — ayrı sprint

---

## 5. Son Commit Tarihçesi

| Hash | Konu |
|------|------|
| `2e44cfff9` | fix(copy): use Dokumente consistently — home.doc_singular/plural + Profilbildschirm; "Belege" çok dar, resmi mektup/Versicherung için "Dokumente" |
| `971b7b357` | fix(home): improve dashboard hierarchy and recent card density — "Dokumente prüfen" + subtitle; kart padding azaltıldı; "Dokument vom" küçük harf |
| `a39f87670` | fix(home): add context label below hero document count — "11" altına "Dokumente" label |
| `62088bd32` | fix(home): clean deadline card, duplicates and review badges — Nächste Frist bug gizlendi; fingerprint dedup; kart "Angaben prüfen" badge kaldırıldı |
| `e53e8ee3a` | chore(ui): remove DEV reset and OCR MVP shortcut from settings — debug build'de bile görünmemeli |
| `2d55970e1` | chore(ui): remove developer type override from main analysis flow — FORCE_TYPE_OPTIONS tamamen kaldırıldı |
| `7c9b6991f` | fix(scan): reopen original source when replacing selected scan — Ändern kaynağa döner; çok sayfa için confirmation |
| `38d3a4f9c` | fix(scan): show real PDF page count in preview + dynamic Ändern copy — hidden Pdf probe; pageCount ile dinamik copy |
| `70e0b441d` | fix(scan): preserve and display page count for multi-page scans — onLoadComplete → ViewerTopBar "1/2"; OcrMvpUploadBox displayName fix |
| `9b3e89fe7` | feat(scan): upload multi-page VisionKit scans as PDF bundle — pdf-lib bundle; silent fallback yok; source_type+pageCount backend'e |
| `6cd0d3da7` | feat(scan-ux): route camera button to native document scanner + multi-page guard — VisionKit açılıyor; >1 sayfa → alert (sessiz veri kaybı yok); tek sayfa → backend analysis zinciri PASS |
| `54e001eab` | feat(scan): add takePhotoWithScanner via VisionKit — ScannedAsset.pageCount; ScannerProvider.takePhotoWithScanner(); iOS=VisionKit, Android/sim=takePhoto() fallback |
| `601d39bc3` | feat(scanner): activate VisionKit native document scanner — Platform.OS==='ios'&&!!RN; BriefPilotVisionScannerModule.swift zaten tam yazılmış |
| `58c4830e8` | fix(ios): declare app localizations so VisionKit uses device language — CFBundleDevelopmentRegion=de; CFBundleLocalizations 7 dil; Almanca cihazda VisionKit Almanca açılıyor |
| `0d2e7e64f` | fix(scan): restore close button on Scan tab screen — onClose→router.replace index; tabBarStyle:none olunca X olmadan kullanıcı sıkışıyordu |
| `bcf13aa9f` | fix(settings): equal-width language pills via onLayout grid calculation — 4 sütun eşit genişlik; alignItems:center |
| `686000efa` | fix(display): hide unknown sender from primary document titles — safeDisplayAbsender placeholder listesi; BEHÖRDEN/AMT·Unbekannt→BEHÖRDEN/AMT |
| `32c12055` | fix(copy): normalize search wording — V4/Semantik/semantic kaldırıldı; Text/Mix/Semantik→Text/Kombiniert/Intelligent; error message Almanca |
| `18a8d1e0` | refactor(search): 3 main groups — Alle/Rechnungen/Behörden/Nachweise; SCHNELLSUCHE 10→4; V4→Intelligente Suche; filter modal Zurücksetzen/Anwenden |
| `495c55a1` | fix(search): show results when alle chip explicitly tapped — chipTapped flag |
| `f5a24dd4` | fix(search): show document results when alle filter is selected — zeigeSuche: query≥1 OR filterAktiv OR typ≠alle |
| `05abceb1f` | chore(feature-flags): hide automation marketplace until backend is available — production settings no longer expose Regelmarkt/Automationen while the backend endpoint is missing |
| `e052f7450` | fix(speech): infer read-aloud locale from spoken text — full text Vorlesen now follows inferred document text language; critical points follow inferred critical-summary text language, with app/device fallback |
| `d25d68f4f` | fix(speech): stop full-text read-aloud immediately on Anhalten — interruptRef resolves current chunk promise instantly; race condition between onDone and cancelledRef check eliminated; Volltext Anhalten PASS |
| `pending current commit` | fix(speech): prefer detected document language for read-aloud — OCR/backend language now persists as `Dokument.detectedLanguage`; full-text Vorlesen uses detected language before heuristic fallback |
| `e2dc5f31e` | fix(speech): show read-aloud in normal detail flow — `DocumentSpeechSection` now renders in `DetailDetailsTab`; Vorlesen is source-independent and text-dependent in the normal detail user flow |
| `d112162b4` | fix(display): sanitize document titles across remaining UI surfaces — SmartLinksPanel/SmartTimelinePanel/PdfMergeDragModal/DocumentContextSheet/DocumentAnalysisProgressCard/ContextualGuidance now use central display sanitizer; raw `%20`, `Bis`, `Angaben prüfen` no longer render as document titles in these UI surfaces |
| `baec9ae1` | fix(display): sanitize document titles across timeline and exports — eventCore/useSmartTimeline safeDisplayTitel; dateExtraction "Bis"→"Zahlung fällig"; safeDisplayTitel no "Angaben prüfen"; single-doc PDF title sanitized; 10/10 test PASS |
| `8fc93fd3` | chore(dev): DEV-only "Alle Dokumente löschen" reset button in Einstellungen — __DEV__ guard, production etkisi yok |
| `fee62528` | fix(storage): persist scan file paths relative to document directory — relativePath field; persistence hydration+migration; 16/16 test PASS |
| `2092164c` | fix(storage): persist document source files before saving — ShareUploadService: persistScanFiles+pages; useDocumentPipeline: no cache URI fallback; OcrMvpScreen: early persist at selection time |
| `d7248215` | fix(layout): fallback when tab bar height context is missing — DetailScreen + ExportBildschirm: useBottomTabBarHeight()→useContext(BottomTabBarHeightContext)??49; Detail crash on router.push fixed |
| `3fb9f127` | fix(export): decode document titles in batch PDF — safeDisplayDocumentTitleForExport helper; exportiereTopluPDF dok.titel raw→decoded; 8/8 test PASS |
| `40d402cb` | fix(layout): replace hardcoded safe-area padding leftovers — Home paddingBottom 152→dynamic; DetailScreen footerPad 132→dynamic; ExportBildschirm hitSlop→HIT_SLOP_LG; OcrMvpResultCard #22C55E→C.success/C.successLight/C.successBorder |
| `994db2b` | fix(copy): simplify modal and secondary AI wording — BelgeAciklamaModal/AutoFillReviewModal KI loading text; 'Mit KI chatten' → 'Fragen zum Dokument' |
| `5106c25` | fix(copy): simplify analysis wording in summary and actions — SmartSummaryCard KI→Cloud-Analyse/Analysiert/Analyse laden; ActionsPanel ai hint KI dili kaldırıldı |
| `060fec3` | fix(copy): remove technical processing wording from detail — V4JobStatusRibbon emoji+Server+OCR kaldırıldı; DocumentAnalysisProgressCard OCR/KI step label + 'Mit Server' düzeltildi |
| `d6ce83b` | refactor(home): remove emoji from core home UI — SmartFolderService/PriorityService emoji→icon field; HomeSmartFolders/HotCardSection/ContextualActionStrip Phosphor icon render eder |
| `5663b6a` | fix(ui): make OCR download action secondary — downloadBtn/modalDownloadBtn hardcoded #22C55E kaldırıldı; outlined/neutral style; Save/Open primary kalır, Excel/download secondary |
| `b919b6e` | fix(copy): remove technical OCR and AI wording — "OCR wird verarbeitet" → "Dokument wird analysiert", "KI-Detail" → "Ausführlich", "Lokal · Offline" → "Offline", "KI · Gecacht" → "Zwischengespeichert"; ConfidencePill raw % kaldırıldı |
| `54b9760` | refactor(detail): reduce secondary action noise — SmartActionsPanel null default, gutschrift label düzeltildi, Erledigt pill → MoreMenu |
| `3d6415a` | docs(mrt): document excel export availability decision — job_id persist edilmiyor, detail sheet'e Excel eklenmez kararı |
| `4655b5f` | fix(export): clarify export option labels and excel copy — pdf_alle/originaldokumente ayrı açıklamalar, export_excel label V7'ye güncellendi, xlsx fallback label netleştirildi |
| `c3793a6` | fix(export): run selected batch export options independently — pdf_alle+originaldokumente OR-block ayrıldı; ikisi seçiliyse ikisi de çalışır, biri artık silently drop edilmiyor |
| `4f796c4` | feat(export): Steuerberater-Excel V7 — invoice_to_excel.py + schema.py v7; Gutschrift-Normalisierung, deutsche Monatsnamen, duplikate Summenzeilen entfernt. Excel V7 backend accepted as Steuerberater-readable V1. Not DATEV. 31/31 PASS. |
| `5f86e8009` | fix(detail): remove duplicate next-step banner from actions tab — NaechsterSchrittCard Erledigen sekmesinden kaldırıldı; ActionsPanel tek next-step yüzeyi |
| `a7c50f8f5` | fix(detail): remove duplicate warning footer from overview hero — AnalyseHeaderCard footer kaldırıldı; NaechsterSchrittCard tek yönlendirme yüzeyi |
| `2ecf63ac2` | fix(home): remove duplicate all-clear message — HomeTriage allZero kartı yeterli, inline blok kaldırıldı |
| `1f86909d2` | refactor(detail): remove Ähnliche Dokumente — confidence leak + gürültü, gelecekte Verlauf/Vergleich olarak yeniden yapılacak |
| `821532cb2` | fix(home): hide empty triage counters — sıfır sayaçlar gizlendi, sadece aktif kategoriler görünür |
| `2b87d4d42` | fix(copy): make OCR result screen production-safe — teknik Server/lokaler Dienst dili kaldırıldı, başlık "Neue Analyse" |
| `c45d23bc5` | fix(ocr-result): make save primary action before export — In Dokumente speichern primary, Excel secondary |
| `4bd710308` | fix(core-flows): three proactive fixes from code audit — gutschrift handler, ExportBildschirm insets, scan tab |
| `57e663fb9` | fix(navigation): open Dokument tab after saving from OCR |
| `3ad9d78cc` | fix(viewer): move fullscreen header to normal flow, fix safe area |
| `c1f81113b` | feat(document-preview): in-app PDF viewer mit react-native-pdf |
| `a24efd3b6` | fix(document-preview): PDF in Vollbild mit react-native-pdf anzeigen |
| `80cac4e02` | fix(document-preview): PDF Vollbild öffnet natives Viewer via Sharing |
| `1985ebf82` | fix(document-preview): show PDF open fallback instead of broken image preview |
| `159cb8bfe` | fix(ui): add insets.bottom to StickyBottomCTA tab padding |
| `2e07fdaa5` | chore(logs): guard production console.log in CloudSyncV4 |
| `3db76ed98` | fix(copy): hide technical confidence percentages from UI |
| `18fe086c9` | fix(ui): standardize safe-area actions and touch targets |
| `6494bba47` | fix(export): replace silent toasts with Alert for export errors |
| `9ebfc2fe1` | fix(selection): long press toggles in active selection mode |
| `7c5e46255` | fix(summary): guard payment menu item + fix batch selection visual |
| `0107c875b` | refactor(export): route batch export through export screen |
| `43c076b2f` | fix(summary): close remaining payment copy leaks for credit documents |

---

## 6. Açık P0/P1 Sorunlar

### P0 — KAPANDI 2026-05-28 ✅
Tüm ana akışlar device'da doğrulandı. Rebuild tamamlandı.

**Clean-state smoke — 2026-05-28 akşam (6 belge, temiz veri):**
- Search Alle (9 sonuç) ✅ — Rechnungen/Behörden/Nachweise chip grupları ✅
- Encoded title (%20) yok ✅ — Bis ana başlık değil ✅ — Angaben prüfen sadece action chip ✅
- **Vorlesen: PASS** (2026-05-29) — Volltext anhören + Anhalten ✅, Kritische Punkte ✅, locale inference ✅
- **VisionKit scan flow: PASS** (2026-05-30) — Kamera butonu native document scanner açıyor ✅, Almanca UI ✅, yeşil/mavi polygon ✅, tek sayfa → backend → Ergebnis → speichern → öffnen ✅, çok sayfa PDF bundle ✅
- **Home premium pass: PASS** (2026-05-30) — "Nächste Frist" bug gizlendi ✅, duplicate kaldırıldı ✅, "Angaben prüfen" badge sessizleşti ✅, "11 Dokumente" label ✅, "Dokumente prüfen + subtitle" ✅
- Dev items temizlendi: OCR MVP shortcut, DEV löschen, force_type override ✅
- Kalan: Preview persistence + Fristen yeni build test edilmedi

### P1 — Açık
- [x] **Überblick footer tekrarı** — `AnalyseHeaderCard` footer kaldırıldı (`a7c50f8f5`). NaechsterSchrittCard tek yönlendirme yüzeyi.
- [ ] **ActionsPanel TS hataları** — `src/features/detail/components/ActionsPanel.tsx:206+` `TS2769: No overload matches this call`. Pre-existing, runtime'ı etkilemiyor.
- [ ] **Export ekranı son öğe görünürlüğü** — device'da onaylanmadı.
- [ ] **Toplu export selectedIds** — device'da onaylanmadı.
- [x] **Raw title backlog — P1-A Messages** — `calendar.ts`, `notifyContent.ts`, `SmartRemindersService.ts`, `WidgetDataService.ts` display-only sanitize edildi. Takvim, bildirim, reminder ve widget yüzeylerinde ham `%20` title basılmaz.
- [x] **Raw title backlog — P1-B Share/Export** — `exporters.ts`, `document-actions/sharing.ts`, `documentActionFlows.ts`, `SignaturePdfSheet.tsx` display-only sanitize edildi. Share/export/mail/signature copy’de ham `%20` title basılmaz.
- [x] **Raw title backlog — P1-C Summaries/Guidance** — `MultiLayerSummaryView.tsx`, `SmartRegionsView.tsx`, `labels.ts`, `homeSuggestions.ts`, `AutoWorkflowEngine.ts`, `documentAnalysis.ts` display-only sanitize edildi. Summary/guidance/suggestion/workflow copy’de ham `%20` title basılmaz.
- [x] **Budget detail raw title** — `src/components/budget-grafik/SeciliAyDetay.tsx` fallback `d.absender || d.titel || d.typ` → `d.absender || safeDisplayTitel(...)`. Budget/ay detay listesinde ham `%20` title basılmaz.
- [ ] **Ürün kuralı genişletmesi** — ham `dok.titel` kullanıcıya görünen copy, notifications, calendar events, share messages, widgets veya summaries içinde doğrudan kullanılmayacak.

### P2 — Backlog (UI Reset Phase 2)
- [x] **SmartRiskPanel explanation/suggestions** — `useState(false)` zaten mevcut. Detay (faktörler/darkPatterns/peerComparison) toggle arkasında. Özet (score+label+erklaerung+vorschlaege) her zaman görünür — bu intended UX. Already satisfied, kod değişikliği gerekmez.
- [x] **SmartActionsPanel default collapsed** — `expandedGruppe = null` yapıldı (`54b9760`).
- [x] **Erledigt pill** — secondary pill'den kaldırıldı, MoreMenu secondary grubuna taşındı (`54b9760`).
- [x] **gutschrift label** — "Gutschrift prüfen" → "Angaben bearbeiten" (`54b9760`). `deriveNextStep`/`detailNextStep`'teki label'lar Überblick konteksti için ayrı — dokunulmadı.
- [x] **OCR teknik dil temizliği** — "OCR" → "Dokument/Analyse", "KI-Detail" → "Ausführlich", cache/offline labels sadeleşti, confidence raw % kaldırıldı (`b919b6e`).
- [x] **OCR download buton hiyerarşisi** — downloadBtn/modalDownloadBtn primary green'den secondary outlined'a taşındı; Save/Open primary kalır (`5663b6a`).
- [x] **Home emoji kaldırıldı** — SmartFolderService/PriorityService `emoji`→`icon` (Phosphor); core home bileşenler Icon render eder. Ürün kararı: core UI'da emoji yok (`d6ce83b`).
- [x] **V4JobStatusRibbon + DocumentAnalysisProgressCard teknik dil** — Server/OCR/KI step label ve durum metni sadeleştirildi (`060fec3`).
- [x] **SmartSummaryCard + ActionsPanel KI etiketleri** — "KI analysiert"/"KI-Analyse"/"KI erklärt" kaldırıldı, kaynak pill "Cloud-Analyse" (`5106c25`).
- [x] **P2 modal KI dili** — `BelgeAciklamaModal`, `AutoFillReviewModal`, `useDetailMoreItems` temizlendi (`994db2b`).
- [x] **Layout / Safe-Area Final Pass** — Home/Detail hardcoded padding→dynamic; ExportBildschirm hitSlop standardize; OcrMvpResultCard hardcoded success renk token'larına taşındı (`40d402cb`).

### Export Audit — KAPANDI 2026-05-28 ✅
- [x] P1 data loss: `handleExport` OR-bug → iki bağımsız if bloğu (`c3793a6`)
- [x] P2 descriptions: `pdf_alle`/`originaldokumente` ayrı sublabel, `export_excel` label V7 (`4655b5f`)
- [x] Excel detail availability: job_id persist edilmiyor → detail sheet'e Excel eklenmez (karar MRT'de)

---

## 7. Kod Yazmadan Önceki Kurallar

1. **MRT'yi oku.** Bu dosyayı okumadan tek satır kod yazma.
2. **Beklenen vs. Mevcut yaz.** Hangi akışı düzeltiyorsun? Ne olması gerekiyor, şu an ne oluyor?
3. **Sadece o akışın dosyaları.** İlgisiz dosyalara dokunma.
4. **Plan önce, kod sonra.** Kullanıcıya planı göster, onay al.
5. **Commit sonrası MRT güncelle.** Bölüm 5 ve 6'yı güncelle.
6. **Görüşünü önce yaz.** Her değişiklik öncesi "Görüşüm:" ile başla.
7. **Dayanağın olmadan konuşma.** Emin değilsen "bilmiyorum, şuraya bakayım" de.

---

## 8. Smoke Checklist — P0 KAPANDI 2026-05-28

| Test | Beklenen Sonuç | Durum |
|------|---------------|-------|
| PDF yükle → önizleme | Küçük önizleme görünür, tap açılır | ✅ |
| PDF fullscreen | In-app render, X/Share safe area'da | ✅ |
| Scan et → kaydet | Dokument sekmesi açılır (Analyse değil) | ✅ |
| VisionKit kamera → backend → kaydet → aç | Tek + çok sayfa PDF bundle PASS (2026-05-30) | ✅ |
| VisionKit Ändern | Aynı kaynağa döner; çok sayfa confirmation alert | ✅ |
| Home "Nächste Frist" bug | Veri yoksa kart gizleniyor | ✅ |
| Home duplicate belgeler | Fingerprint dedup aktif | ✅ |
| Home "Angaben prüfen" | Kartta yok, sadece summary'de | ✅ |
| Home sayaç label | "11 Dokumente" — net context | ✅ |
| Dev items | Scan/Einstellungen'da görünmüyor | ✅ |
| OCR kaydet → aç | Dokument sekmesi açılır | ✅ |
| Negatif tutar belgesi | Zahlung butonu yok, Gutschrift gösterir | ✅ |
| OCR result CTA sırası | In Dokumente speichern primary, Excel secondary | ✅ |
| Export ekranı | Son öğe CTA'nın üzerinde görünür | ⬜ onaylanmadı |
| Toplu export | selectedIds doğru filtreleniyor | ⬜ onaylanmadı |
| Frist < 3 gün | Zahlen primary action gösterir | ⬜ onaylanmadı |

---

## 9. Backlog (Motor Bittikten Sonra)

Sıra: **Motor (P0 fixes) → Empty States → Haptic Feedback → Undo → List Card → Swipe → AI Reply → Onboarding → App Icon**

- **Verlauf/Vergleich:** Ähnliche Dokumente kaldırıldı (`1f86909d2`). Yerine: aynı Absender/Kundennummer belgelerini grupla, tarihe/tutara göre sırala, önceki fatura ile karşılaştır, grup Excel export. Şimdi değil.
- **PDF araçları:** PDF split/merge UI (altyapı mevcut, UI yok)
- **Cloud voice:** Sesli not → transkript → belge
- **Professional UI reset:** Tüm ekranlar için görsel denetim
- **Localization audit:** Türkçe/Almanca karışık string'ler
- **Onboarding:** First-value akışı (`/first-value` route)
- **App icon:** Final versiyon
- **DATEV export:** `ENABLE_RELEASE_DATEV_EXPORT` flag açılınca aktif
- **Partner email:** Zahlen mit Partner akışı test edilmedi
