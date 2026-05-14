# BRİEFPİLOT — KAPSAMLI DURUM RAPORU
*14 Mayıs 2026 — Son güncelleme: 14 Mayıs 2026 (gece)*

---

## 1. OCR PIPELINE — MEVCUT DURUM

### Eğitim Geçmişi & En İyi Model

| Model | Dataset | Acc | norm_edit_dis | FPS |
|---|---|---|---|---|
| mac_balanced_v21_w480 | balanced_v21 | 93.8% | 0.993 | 6 |
| gpu_v2_officialDocs_run2 | officialDocs_60k | 93.89% | 0.993 | 797 |
| **gpu_v4_splitaddr_w480** | **splitaddr_10k** | **95.21%** | **0.991** | **792** |
| **gpu_v5_L40S** *(devam ediyor)* | v5_comprehensive_80k | — | — | 699 |

**Şu an en iyi stabil model:** `ppocrv4_w480_splitaddr_v4_pct9521_BEST.tar.gz` — %95.21

---

### v5 Eğitimi — L40S Güncel Durum

**Run:** `gpu_v5_L40S_ppocrv4_mobile_b96`
**GPU:** NVIDIA L40S 48 GB
**Model:** PP-OCRv4 Mobile Rec / SVTR_LCNet + MultiHead ✅
**Dataset:** v5_comprehensive_80k (68k train / 12k val / 96 char dict)
**Batch:** 96, fix_bs: true, Eval batch: 128
**Paddle:** 2.6.1 | NumPy: 1.26.4 | Python: 3.12.3

İlk validation (epoch 3):
```
acc:           0.6705
norm_edit_dis: 0.9160
fps:           698.98
best_epoch:    3
```

Epoch 5 batch log'ları:
```
batch acc:     ~0.80–0.83
norm_edit_dis: ~0.95–0.96
loss:          ~3
ips:           190–235 samples/s
ETA:           ~2:20
VRAM:          ~36 GB reserved / ~23 GB allocated
```

**Durum:** Sağlıklı. Devam etmeli.

> **Not:** Önceki A5000 üzerindeki CRNN run yanlış yapılandırmaydı (MultiHead
> yerine CTCHead). Epoch 18'de %63.7 platonlaşması bundan kaynaklandı. L40S run
> doğru baseline kabul edilmeli.

---

### OCR Training Standard

Ayrıntılar için: `docs/OCR_L40S_TRAINING_STANDARD.md`

**Özet:**
- Üretim GPU'su: L40S 48 GB
- A5000 / 4090 (24 GB) → SVTR_LCNet + MultiHead için sınırda, üretim için önerilmez
- RTX 5090 → Paddle 2.x Blackwell desteği yok
- Stabil kombinasyon: Paddle 2.6.1 + NumPy 1.26.4 + Python 3.12.3

---

### Dataset Kalitesi

**Güçlü:**
- 80k dengeli kategori (11 domain)
- Finanzamt: 11,200 örnek (v2'de 121'di)
- ÄÖÜäöüß yeterli temsil, §, €, – mevcut

**Açıklar (bir sonraki dataset'te kapatılacak):**
- `q @  & ° ² = ? ! ;` — dict'te var ama training'de sıfır örnek
- degraded_scan yalnızca %4 — gerçek faks kalitesi için yetersiz

---

### %99+ Accuracy Planı

1. **v5 run'ı bitirmesini bekle** (epoch 30)
2. **Eğer acc > 96.0%** → production candidate, inference export et
3. **Eğer 95–96% arası** → v6 dataset: eksik char synthetic sample + degraded scan 3x büyüt
4. **Eğer yeni char hatası varsa** → sadece o karakterler için hardcase fine-tune

| Aksiyon | Kazanım | Efor | Durum |
|---|---|---|---|
| Eksik 9 char synthetic sample (5k) | +1.0-1.2pp | 2-3 gün | Beklemede |
| Degraded scan 3x büyüt | +0.7-0.8pp | 2 gün | Beklemede |
| **SVTR_LCNet doğru mimarisi** | **+0.8-1.2pp** | — | **✅ Başladı / L40S'te devam ediyor** |
| CRNN+SVTR ensemble | +0.3-0.5pp | 1 gün | Beklemede |
| Domain lexicon post-processing | +0.5-0.8pp | 1-2 gün | Beklemede |
| Rule validator (IBAN, Steuernr) | +0.3-0.5pp | 1 gün | Beklemede |

---

## 2. CLIENT PIPELINE — MEVCUT DURUM

### Modül Durumu

| Modül | Kalite | Kritik Sorun |
|---|---|---|
| OCR Layer | %70 | Date UTC fix ✅ uygulandı; confidence null-safe: TODO |
| Field Extraction | %75 | Betrag parsing fix ✅ uygulandı; regex multiline: TODO |
| Categorization | %75 | Confidence hardcoded 90: TODO |
| Summary | %85 | OK |
| Risk Engine | %80 | Betrag type guard ✅ uygulandı |
| Smart Search | %75 | rohText 500 char truncation: TODO |
| Suggestions | %80 | OK |
| Timeline | %80 | OK |
| Cloud Sync | %80 | Race condition ✅ / ConflictResolver ✅ düzeltildi |
| Reply Generator | %70 | OK |
| Personal AI Twin | %75 | OK |

---

### 14 Mayıs'ta Yapılanlar

**Bug fix'ler (23/23 test geçti):**
- Bug #1: UTC date offset — `analyseText.ts` → `Date.UTC()` kullanıma alındı
- Bug #2: German amount parser — `invoiceExtractor.ts` → `parseGermanAmount()` yazıldı
- Bug #3: betrag type guard — `factors.ts` → `resolveBetrag()` ile safe cast
- Bug #4: Sync race condition — `BackgroundSyncEngine.ts` → `isSyncing` lock eklendi
- Bug #5: ConflictResolver JSON equality — semantic field-by-field compare

**Çeviri sistemi:**
- `sharing.ts`, `calendarAndAppeals.ts`, `formsAndContacts.ts` → hardcoded string'ler `t()` ile değiştirildi
- `translations.ts` → 7 dile ~60 yeni key eklendi

**Yeni eksik modüller:**
- `ConflictResolver.ts`, `BackgroundSyncEngine.ts`, `TemplateLibrary.ts`,
  `ToneAdjuster.ts`, `AutoCategoryPredictor.ts` eklendi

**Dokümanlar:**
- `docs/OCR_L40S_TRAINING_STANDARD.md` oluşturuldu
- `docs/BRIEFPILOT_STATUS_REPORT_2026-05-14.md` (bu dosya) oluşturuldu
- `Desktop/BriefPilot_Durum_Raporu_2026-05-14.md` güncellendi

---

## 3. KALAN RİSKLER & TODO

### Öncelik 2 (Bu Hafta)

| Sorun | Dosya | Etki |
|---|---|---|
| institutionMatch confidence hardcoded 90 | institutionMatch.ts | Phishing match riski |
| OCR confidence null propagation | extractTextFromImage.ts | Risk NaN cascade |
| Search rohText 500 char truncation | runSmartSearch.ts | Çok sayfalı dokümanda miss |
| Peer comparison min threshold yok | peerComparison.ts | 2 doc'la anlamsız istatistik |
| Regex multiline eksik | extractors.ts | ~20% false negative rate |
| Silent catch (no logging) | CloudMetadataStore.ts | Debug imkansız |
| PDF multipage context kaybı | extractTextFromImage.ts | Page 2+ bilgisi karışıyor |

### Öncelik 3 (İki Hafta İçinde)

- OCR v5 sonucu değerlendirme + varsa v6 dataset üretimi
- IBAN checksum + Steuernummer format rule validator
- Domain lexicon post-processing entegrasyonu
- Search full-text indexing (500 char kaldır)

---

## 4. GENEL TABLO

| Alan | Mevcut | Hedef | Durum |
|---|---|---|---|
| OCR Word Accuracy | %95.21 | %99+ | v5 eğitimi devam ediyor |
| Field Extraction Doğruluğu | ~%80 | ~%95 | Betrag fix uygulandı |
| Hata mesajı dil tutarlılığı | %100 | %100 | ✅ Tamamlandı |
| Client pipeline kritik bug | 0 | 0 | ✅ 5/5 düzeltildi |
| Cloud sync güvenilirliği | %90 | %99 | Race + conflict fix uygulandı |
