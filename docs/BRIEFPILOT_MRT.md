# BriefPilot MRT — Master Reference & Tracker

**Protokol:** Her yeni oturumda bu dosyayı önce oku. Kod yazmadan önce buraya bak. Her commit sonrası güncelle.

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

### P1 — Açık
- [x] **Überblick footer tekrarı** — `AnalyseHeaderCard` footer kaldırıldı (`a7c50f8f5`). NaechsterSchrittCard tek yönlendirme yüzeyi.
- [ ] **ActionsPanel TS hataları** — `src/features/detail/components/ActionsPanel.tsx:206+` `TS2769: No overload matches this call`. Pre-existing, runtime'ı etkilemiyor.
- [ ] **Export ekranı son öğe görünürlüğü** — device'da onaylanmadı.
- [ ] **Toplu export selectedIds** — device'da onaylanmadı.

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
