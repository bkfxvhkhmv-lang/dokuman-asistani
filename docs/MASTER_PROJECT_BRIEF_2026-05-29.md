# BriefPilot — Master Project Brief
*Son güncelleme: 2026-05-29 | Bu dosyayı her yeni oturumda ilk oku.*

---

## 1. Projenin Özü

**Ne yapar:** Almanya'daki Türk kullanıcıların Almanca resmi belgelerini (fatura, ceza, vergi, kurum yazısı) kamerayla tarayıp anlayan, özetleyen, ne yapmaları gerektiğini söyleyen mobil asistan.

**Hedef kitle:** Almanya'da yaşayan Türkçe konuşan kullanıcılar, Almanca yazışmalarda zorlananlar.

**Rakiplere farkı:** CamScanner gibi araçlar sadece tarıyor. BriefPilot belgeyi anlıyor — tutar, tarih, IBAN, risk, aksiyon.

**App Store hedef:** Almanya'da top 10 productivity. Şu an TestFlight aşamasına yakın.

---

## 2. Teknik Stack

```
Frontend:  React Native 0.81.5 + Expo ~54 + expo-router v6
State:     useReducer + Context (store.tsx)
Backend:   FastAPI + PostgreSQL + Celery (api.briefpilot.app)
OCR:       Google Vision API (mevcut production) + BriefPilot kendi modeli (eğitimde)
AI/LLM:    BriefPilot backend /documents/analyze endpoint (OCR + field extraction + summary + risk)
Build:     EAS Build, iOS buildNumber şu an 4, version 4.0.0
Branch:    feature/ocr-api-integration
```

---

## 3. OCR Model Eğitim Tarihi — Kritik Özet

Bu bölüm çok önemli. Bağlam kaybolduğunda buraya bak.

### Model Versiyonları ve Accuracy

| Model | Dataset | Val Acc | Durum |
|-------|---------|---------|-------|
| mac_balanced_v21 | 5k balanced | 93.8% | Geçildi |
| gpu_v2_officialDocs | 60k official docs | 93.89% | Geçildi |
| **gpu_v4_splitaddr** | 10k split addr + umlaut | **95.21%** | En iyi clean model |
| gpu_v5_L40S | 80k comprehensive | ~43% (plato) | ❌ Başarısız |
| gpu_v6_charfix | 80k charfix | Yetersiz | ❌ Hedef doğruluğa ulaşamadı |
| V8A | Real-world eval | 62.41% | Geçildi |
| **V8B** | Real-world eval | **62.92%** | ✅ Şu an production base |
| V9 | 10k error booster | 47.33% | ❌ Regresyon — KULLANILMIYOR |
| V10 | Gerçek scan dataset | — | Planlanıyor |

**Kritik fark:** V4 modelinin %95.21'i synthetic/clean veri üzerinde. Gerçek dünya benchmark (3 Mayıs 2026) çok daha düşük:
- avg_confidence: 0.60
- keyword overlap: **%7**
- sender bulma: **%10**
- tutar bulma: **%0**

Bu **distribution shift** problemi — model synthetic'te iyi, gerçek scan'de zayıf.

### Neden production'da değil

V8B ~%63 accuracy ile Google Vision'ın (~%95) çok gerisinde. Karar: kendi modelimizi paralelde eğitmeye devam, production'da Google Vision + BriefPilot backend kullan.

### Bir sonraki hamle için gerekli

1. Gerçek scan görüntüleriyle dataset (V10)
2. Distribution shift'i kapatmak için degraded/real scan örneklerini artır
3. Eksik karakterler (q, @, &, °, ²) için boost

---

## 4. Production Pipeline (Şu An Çalışan)

```
Kullanıcı → Scan butonu (Kamera/Dosya/Galeri)
          → api.briefpilot.app/documents/analyze
          → AI extraction (10-30 saniye, LLM-tabanlı)
          → fields + summary + risk + recommended_actions
          → Dokumente'ye kaydet → açık
```

**OCR MVP = BriefPilot backend pipeline.** "OCR MVP" adı kullanıcıya gösterilmiyor, sadece internal.

**30 saniye sorunu:** Backend LLM-tabanlı analiz yapıyor. Background processing henüz yok — kullanıcı ekranda bekliyor. Bu P1 UX sorunu, backend optimize edilmesi gerekiyor.

**Kendi eğitim datası toplama:** Şu an yapılmıyor. Her analiz sonucu + kullanıcı düzeltmeleri ground truth olarak kaydedilmiyor. Bu stratejik açık — ileride çözülmesi gerekiyor.

---

## 5. iOS App Durumu — Son Hali (2026-05-29)

### Tamamlanan P0/P1'ler
- ✅ Vorlesen (TTS): render placement fix, locale inference, Anhalten race condition fix, silent mode fix, voice fallback
- ✅ Scan tab → OCR MVP backend bağlandı (e0d50efb0)
- ✅ Raw title / %20 sızıntısı ana yüzeylerde temizlendi
- ✅ Search sadeleşti: Alle/Rechnungen/Behörden/Nachweise
- ✅ Export/share title sanitization
- ✅ Regelmarkt/Automationen production'dan gizlendi
- ✅ Source file persistence (relativePath)
- ✅ OCR MVP dead "Bald verfügbar" aksiyonları temizlendi
- ✅ Professional UI copy temizliği (KI/Server/OCR teknik dil kaldırıldı)

### Açık Sorular / Kararlar Bekleniyor
- **Option A vs B:** Scan tab şu an direkt OcrMvpScreen'e gidiyor (Option A). Custom scanner UX (perspektif düzeltme, çok sayfa) kaybedildi. Kullanıcı onayı bekleniyor.
- **30 saniye background processing:** Kullanıcıyı beklemeye sokmamak için backend'e job async yapısı veya optimizasyon gerekiyor.
- **TestFlight:** Scan Option A kararı verildi (build 4). EAS build alınabilir.

### Bilinen Sınırlamalar (TestFlight'a gidebilir ama not alınmalı)
- PDF upload → Vorlesen çalışmaz (text extraction yok)
- Excel sadece OCR result ekranında, saved document'tan değil
- Backup/restore geniş smoke görmedi
- Calendar/reminder/widget cluster geniş smoke görmedi
- OCR confidence düşük belgeler "Angaben prüfen" badge'i her yerde gösteriyor
- "Unbekannt" absender hâlâ görünüyor (OCR kalitesi sorunu)

---

## 5b. OCR V10 Dataset Pipeline — Aktif Çalışma

**Kritik bilgi:** V10, distribution shift problemini çözmek için gerçek DACH dokümanlarıyla hazırlanan yeni dataset.

**Konum:** `~/Desktop/OCR_Egitim/briefpilot_ocr_v10_2_TRUE_HARDENED_HARMONIZED_54TESTS/`

**V10 DACH Night Run sonuçları (18 Mayıs 2026):**
- Toplanan doküman: 2,402 (54 farklı domain)
- Güvenli sayfalar (eğitilebilir): 2,927
- Crop sayısı: 82,564
- Kaynaklar: vwgh.gv.at, ogh.gv.at, justiz.hamburg.de, bundesarbeitsgericht.de, bundesfinanzhof.de, finanzamt.nrw.de vb. — gerçek Almanya/Avusturya/İsviçre resmi dokümanları

**V10 pipeline özellikleri:**
- Gerçek kamu dokümanları (synthetic değil) → distribution shift çözümü
- PII gating (kişisel veri koruması)
- Rights/license classifier (GDPR uyumlu)
- Provenance chain tracking
- 54 test geçiyor

**Bu neden önemli:** V8B'nin %63 accuracy'si büyük ölçüde synthetic→real distribution shift'ten kaynaklanıyor. V10 gerçek dokümanlarla eğitilince bu gap kapanacak.

---

## 5c. Rakip Analizi — Accountable (Masterroadplan.docx)

**Accountable'dan öğrenilenler:**
1. **AI sparkle (✦) pattern** — AI'ın otomatik doldurduğu alanlara küçük ✦ ikonu. Kullanıcı neye güveneceğini anlıyor. BriefPilot'ta **yok, eklenmeli.**
2. **"Daten werden erkannt..." loading** — tek ikon, animasyonlu tarama çizgisi, merkezi. Çok etkili.
3. **Onboarding** — ülke → vergi durumu → uygulama değeri anlatılıyor. BriefPilot'ta henüz yok.
4. **Sayfa sayısı gösterimi** — "Sichern (2)" kamera sırasında anlık sayfa sayısı. Basit ama değerli.
5. **Alt sheet aksiyon menüsü** — destructive action kırmızı, diğerleri normal.

**BriefPilot'un Accountable'a karşı avantajları:**
- Risk skoru (hoch/mittel/niedrig) — Accountable'da **yok**
- Çok daha derin aksiyon sistemi (Zahlen + Einspruch + Kalender + AI chat + yanıt taslağı)
- Belge çeşitliliği: Mahnung, Gerichtsbescheid, Steuerbescheid, Versicherung, Vertrag — Accountable sadece Ausgaben
- Accountable dar kitle (Gewerbetreibende), BriefPilot tüm Almanya'daki Türkler

**Accountable'ın zayıflığı = BriefPilot'un fırsatı:** Birisi avukat mektubu yüklerse Accountable ne yapacağını bilmiyor.

---

## 5d. Android vs iOS UI Gerçekleri (premium dokunma.docx)

Şu an iOS odaklı geliştirme yapılıyor, ama Android'e çıkılacaksa bilinmesi gerekenler:

| Efekt | iOS | Android |
|-------|-----|---------|
| Blur (cam efekti) | ✅ UIBlurEffect | ❌ Yok (fake screenshot blur) |
| Renkli glow | ✅ | ❌ Sadece gri elevation |
| Gradient | ✅ | ⚠️ GPU flatten ediyor |
| Shadow | ✅ | ⚠️ Sadece elevation |

**Çözüm (Revolut/Spotify yöntemi):** Blur yok ama yarı şeffaf solid + gradient overlay + border + elevation kombinasyonu "cam hissi" veriyor. Bu şu an iOS'ta premium görünen UI'ın Android portu için hazır plan.

---

## 6. Repo Yapısı — Önemli Dosyalar

```
docs/
  BRIEFPILOT_MRT.md              ← Ana karar ve commit tarihi
  RELEASE_SNAPSHOT_2026-05-28.md ← Anlık durum tablosu
  MASTER_PROJECT_BRIEF_2026-05-29.md ← Bu dosya
  SCAN_MIGRATION_PLAN.md         ← Scan modülü taşıma geçmişi
  backend/OCR_BACKEND_INTEGRATION_PLAN.md ← Backend API planı
  ai/DOCUMENT_AI_STRATEGY.md     ← AI katman stratejisi (OCR→RAG→LLM)
  SPRINT_ROADMAP.md              ← Sprint 1-6 planı
  
app/(tabs)/Kamera.tsx            ← Scan tab entry (şu an OcrMvpScreen)
src/features/ocr-mvp/            ← OCR MVP akış (production pipeline)
src/features/scan/               ← Eski custom scanner (bypass edildi)
src/hooks/useDocumentPipeline.ts ← Eski pipeline (Google Vision + local)
src/services/ocrMvpApi.ts        ← Backend API çağrıları
src/config.ts                    ← OCR_MVP_BASE URL config

Desktop/OCR_Egitim/BRIEFPILOT_OCR_TRAINING_HUB/
  00_SUMMARY/OCR_TRAINING_SUMMARY.md ← V8A/B/V9 sonuçları
  03_MODELS/V8B_best/             ← Şu an en iyi model
  04_EVALS/                       ← Eval logları
Desktop/BriefPilot_Proje/BRIEFPILOT_PROJECT_HUB/
  OCR/OCR_TRAINING_HISTORY_REPORT.txt ← Tüm OCR geçmişi
Desktop/SORTED_Notes/BriefPilot/
  BriefPilot_Teknik_Dokuman.md    ← V6 teknik referans (Nisan 2026)
  BriefPilot_Neler_Yapabilir.md   ← Ürün özellikleri
Desktop/BriefPilot_Proje/Doku/briefpilot_ozet.txt ← V4 tam özet
```

---

## 7. Stratejik Kararlar (Kalıcı)

| Karar | Gerekçe |
|-------|---------|
| Kendi OCR modelini production'a koymuyoruz | V8B ~%63, Google Vision ~%95. Gap çok büyük. |
| Production: Google Vision + BriefPilot backend | Hızlı, güvenilir OCR + AI extraction kombinasyonu |
| Kendi modeli shadow mode'da geliştirilecek | Distribution shift = gerçek scan datası lazım (V10) |
| UI dili: Almanca | Hedef kullanıcı Almanya'da |
| Kod dili: İngilizce | Standart |
| Commit mesajları: Almanca | Proje kural |
| Onay almadan kod yazılmaz | Her plan önce gösterilir, onaylanır |
| Yeni feature başlatılmaz | Önce smoke → TestFlight → sonra feature |

---

## 8. Bir Sonraki Oturum İçin Açık Sorular

1. **Scan tab kararı:** Option A (OcrMvpScreen direkt) mi kalacak, yoksa Option B (ScanScreen UX + backend analiz) mi uygulanacak?
2. **30 saniye:** Background processing ne zaman ele alınacak?
3. **TestFlight:** Yukarıdaki karar verildikten sonra build al, dağıt.
4. **V10 OCR dataset:** Gerçek scan görüntüleri toplanmaya ne zaman başlanacak?
5. **Training data capture:** Her backend analiz + kullanıcı düzeltmesi kaydedilmeli — ne zaman?

---

*Oluşturulma: 2026-05-29 Claude Sonnet 4.6 + Bayramgul*
*Kaynak: OCR training reports, desktop notes, repo docs, kod audit*
