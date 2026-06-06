# Android 8.0 — OCR Upload/Picker Cancel & Back Affordances Audit

**Tarih:** 2026-06-06  
**Kapsam:** OCR upload akışı, tüm picker entry noktaları, processing state, result modal  
**Cihaz:** Pixel 9 Pro — Android 15 (Expo Router, New Architecture, Hermes)  
**Durum:** Docs only — no code, no commit

---

## 1. Flow Inventory

| # | Akış | UI sahibi | Görünür Abbrechen/Close | Android Back çalışır mı? | Cancel sonrası dönülen yer | Ağırlık |
|---|------|-----------|------------------------|--------------------------|---------------------------|---------|
| **F1** | Upload Box idle → "Scannen" (Android=plain camera, iOS=VisionKit) | **Sistem** (ImagePicker/VisionKit) | YOK — OS camera UI, kendi dismiss kontrolü | **EVET** — OS kamera dismiss eder | Upload Box idle bekleniyor — ancak camera dismiss sonrası siyah ekran veya belirsiz state gözlemlendi (Android) | **⚠️ WARN** |
| **F2** | Upload Box idle → "Datei auswählen" (DocumentPicker) | **Sistem** (DocumentPicker sheet) | **EVET** — OS sheet kendi × / Geri kontrolü | **EVET** — OS dismiss | Upload Box idle | PASS |
| **F3** | Upload Box idle → "Foto importieren" (pickFromLibrary) | **Sistem** (ImagePicker photo library) | **EVET** — OS library dismiss kontrolü | **EVET** — OS dismiss | Upload Box idle | PASS |
| **F4** | Upload Box selected → "Ändern" → çok sayfalı replace Alert | **Uygulama** (Alert) | **EVET** — "ABBRECHEN" butonu mevcut | **EVET** — Android, Alert'i dismiss eder | Selected asset card (değişiklik yok) | PASS |
| **F5** | Upload Box selected → "Ändern" → picker yeniden açılır | **Sistem** (OS picker) | YOK — OS UI | **EVET** | Selected asset card (null → değişiklik yok) | PASS |
| **F6** | Uploading / Processing state (isActive=true) | **Uygulama** (OcrMvpStatusCard) | **YOK** — analiz iptali butonu yok; header × ekrandan çıkış yapıyor | **EVET** — Expo Router ekrandan çıkar | Önceki ekran (analiz job ortada kalır) | **⚠️ P1** |
| **F7** | OcrMvpScreen × header butonu — idle state | **Uygulama** | **EVET** — × görünür (her iki mount noktasında) | **EVET** — Expo Router | Önceki ekran (veri kaybı yok) | PASS |
| **F8** | OcrMvpScreen × header butonu — scanner/picker aktifken | **Uygulama** | **HAYIR** — `hideIdleChrome=true` → opacity:0, pointerEvents:none | **BELİRSİZ** — hardware back teknik olarak çalışıyor ancak dönüş ekranı siyah veya belirsiz state olabiliyor; ekran kilidi tetiklenebiliyor | Belirsiz — siyah ekran veya donmuş UI gözlemlendi | **🔴 NO-GO** |
| **F9** | OcrMvpScreen × header butonu — done state (result görünür) | **Uygulama** | **EVET** — × görünür | **EVET** | Önceki ekran (result card ekrandan çekilir; belge `isSavedToDocuments=true` ise kayıp yok) | WARN (zayıf) |
| **F10** | Preview Modal (Datenvorschau) aç → kapat | **Uygulama** (Modal) | **EVET** — HeaderIconButton × mevcut | **EVET** — `onRequestClose` ✓ | OcrMvpResultCard | PASS |
| **F11** | Result card → yeni analiz picker tetikleme → cancel | **Sistem** (OS picker, runNewAnalysisPick) | YOK — OS picker UI | **EVET** | Result card korunuyor (`handleReset()` null döndüğünde çağrılmıyor) | PASS |
| **F12** | Result card → yeni analiz butonu — picker açıkken (`entryBusy=true`) | **Uygulama** (disabled butonlar) | N/A — butonlar zaten devre dışı | N/A | Result card korunuyor | PASS |

---

## 2. Değerlendirme: OS Picker mi, Uygulama UI Açığı mı?

**Büyük çoğunluk OS picker davranışı — ve doğru çalışıyor.**

- F1–F3, F5, F11: OS-owned sistem picker'lar. Cancel → `res.canceled` / `result.cancelled` kontrolü → null → `withPicking` veya `runNewAnalysisPick` içinde erken çıkış → mevcut state dokunulmadan kalıyor. Ekstra uygulama kodu gerektirmiyor.
- F4: Uygulama Alert — "ABBRECHEN" butonu mevcut, Android back da dismiss ediyor. Doğru.
- F10: Preview Modal — `onRequestClose` + HeaderIconButton. Doğru.
- F12: `entryBusy` guard — picker aktifken butonlar disabled. Doğru.

**Üç gerçek uygulama açığı var — biri NO-GO, biri P1:**

> **Önemli ayrım:** OS picker cancel davranışı (F2, F3, F5, F11) büyük ölçüde doğru çalışıyor ve uygulama tarafında ek işlem gerektirmiyor. Scanner/camera lifecycle (F1 + F8) ise OS picker sınırlaması değil — Android Activity lifecycle ile camera session uyumsuzluğundan kaynaklanan app gate blocker.

### Açık #1 — F6: Uploading/Processing sırasında "Analyse abbrechen" yok (P1)

`isActive = true` iken `OcrMvpStatusCard` tam ekran gösteriliyor. Sayfada **analiz iptali butonu bulunmuyor.** Header × butonu görünür ve fonksiyonel, ancak bunu basmak Expo Router aracılığıyla önceki ekrana **ekrandan tamamen çıkış** yaptırıyor — analiz job'ı arka planda askıda kalıyor ya da kesiliyor, kullanıcı bunu bilemez.

**Risk:** Kullanıcı yanlışlıkla × basarsa işlemi iptal etmek mi yoksa ekrandan çıkmak mı istediğini ayırt edemiyor. × "çıkış" mı "analizi durdur" mu sorusuna cevap vermiyor.

### Açık #2 — F1 + F8: Android scanner dismiss/resume lifecycle (NO-GO — yükseltildi)

**Önceki değerlendirme (WARN) güncellendi.** Cihazda gözlemlendi: camera dismiss veya fiziksel geri tuşu basıldıktan sonra uygulama **siyah ekran veya belirsiz UI state** ile dönüyor. Ayrıca tarama sırasında veya analiz başlamadan önce **ekran kilidi** tetiklenebiliyor.

`hideIdleChrome = scannerOpen && !isActive` → header `opacity: 0`, `pointerEvents: 'none'` — × butonu scanner aktifken görünmüyor. Android hardware back teknik olarak çalışıyor, ancak dönüş ekranı siyah veya donmuş UI üretebildiğinden bu "çalışıyor" sayılmaz.

**Önemli ayrım:** Bu bir görsel tutarsızlık değil — Android Activity lifecycle ile camera session uyumsuzluğu. OS picker davranışı değil; uygulama tarafında kapatılması gereken gate blocker.

---

## 3. Önerilen Düzeltmeler

### 8.1 Limited Beta'dan Önce Yapılmalı

| # | Akış | Düzeltme |
|---|------|---------|
| **Fix-1** | **F6 — Uploading/Processing** | `OcrMvpStatusCard` içinde veya `centeredState` view'ına "Analyse abbrechen" secondary CTA ekle. Tepki: `handleReset()` + Expo Router back. `×` header butonu upload sırasında da kalabilir ama işlev label'ı netleşmeli. |
| **Fix-2 (NO-GO)** | **F1 + F8 — Android scanner lifecycle** | Camera dismiss/back sonrası siyah ekran ve ekran kilidi sorununu çöz. `takePhotoWithScanner()` → `takePhoto()` fall-back'inin Android Activity lifecycle'ıyla uyumunu doğrula; gerekirse kamera session suspend/resume yönetimini ekle. AC-1..AC-7 (bkz. release hygiene checklist §4.1) cihazda geçmeden 8.1 limited beta başlatılamaz. |

**Fix-1 kapsamı:** UI only — OcrMvpScreen (`centeredState` view) veya OcrMvpStatusCard. Backend hook veya native değişiklik gerektirmiyor.  
**Fix-2 kapsamı:** Scanner/camera lifecycle — `ExpoScannerProvider.takePhoto()`, Android Activity suspend/resume. Native uyum gerektiriyor olabilir.

---

### Kabul Edilebilir WARN (8.0 internal için)

| # | Akış | Neden WARN kalabilir |
|---|------|----------------------|
| **W-1 → NO-GO** | **F8 — scanner aktifken × gizleniyor** | **Reklasifiye edildi: NO-GO (bkz. Fix-2).** Camera dismiss/back sonrası siyah ekran ve ekran kilidi gözlemlendi — "Android hardware back köprü kuruyor" geçerliliğini yitirdi. 8.1 öncesi zorunlu fix. |
| **W-2** | **F9 — done state'de × basılırsa result card'dan çıkılıyor** | `isSavedToDocuments=true` ise belge zaten Documents'a kaydedildi; bilgi kaybı yok. `isSavedToDocuments=false` iken çıkış uyarısı ileride eklenebilir. |

---

### Sonraki Geliştirme (Polish — beta sonrası)

- **F9 exit guard:** Done state'de kayıt yapılmamışken × basılırsa "Analyse verlassen? Nicht gespeicherte Ergebnisse gehen verloren" confirm Alert.
- **F8 görsel tutarlılık:** `hideIdleChrome` aktifken header tamamen kaldırmak yerine translucent overlay veya fade-in animasyonu — gizleme yerine görsel baskı.

---

## 4. Özet Tablo

| Akış grubu | Kontrol sahibi | Durumu |
|-----------|----------------|--------|
| OS picker (Scan / Datei / Foto / Library) | Sistem | ✅ Doğru — cancel → null → mevcut state korunuyor |
| Replace confirm Alert | Uygulama | ✅ ABBRECHEN mevcut, Android back çalışıyor |
| Preview Modal | Uygulama | ✅ onRequestClose + HeaderIconButton |
| Result card yeni analiz cancel | Sistem + uygulama | ✅ handleReset null'da çağrılmıyor |
| entryBusy guard | Uygulama | ✅ picker açıkken butonlar disabled |
| **Uploading/Processing iptal** | **Uygulama** | **⚠️ P1 — analiz iptali butonu yok** |
| **Android scanner lifecycle (F1 + F8)** | **Uygulama** | **🔴 NO-GO — camera dismiss siyah ekran/belirsiz state; ekran kilidi tetiklenebiliyor; Fix-2 zorunlu** |
| Done state × çıkışı | Uygulama | ⚠️ WARN (zayıf) — kayıt varsa bilgi kaybı yok |

---

## 5. 8.1 için Eylem Kalemleri

```
[ ] Fix-1: OcrMvpScreen centeredState view'ına veya OcrMvpStatusCard'a
    "Analyse abbrechen" secondary CTA ekle
    → onPress: handleReset() — status idle'a sıfırlar, Expo Router back opsiyonel
    → scope: UI only, src/features/ocr-mvp/ içi
    → tsc: 0 hata doğrula
    → Pixel 9 Pro smoke: uploading sırasında butona bas → upload box'a dön

[ ] Fix-2 (NO-GO): Android scanner dismiss/resume lifecycle
    → camera dismiss/back → Upload Box veya Result Card görünür, siyah ekran yok
    → scanner/OCR processing sırasında ekran kilidi tetiklenmiyor
    → AC-1..AC-7 Pixel 9 Pro'da geçmeli (bkz. release hygiene checklist §4.1)
    → scope: ExpoScannerProvider / scanner/camera lifecycle
    → tsc: 0 hata doğrula
    → Pixel 9 Pro smoke: tüm AC'ler elle doğrulanmalı
```

---

*Docs only — hiçbir dosya değiştirilmedi, commit yapılmadı.*
