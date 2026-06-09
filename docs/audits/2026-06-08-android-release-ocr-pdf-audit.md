# BriefPilot 8.1 — Android Release / OCR / PDF Audit

## Final Status (2026-06-08)

| Gate | Sonuç |
|---|---|
| Release launch | PASS |
| ConfigGate | PASS |
| OCR Analyse | PASS |
| Scanner smoke | PASS |
| Privacy copy | PASS WITH NOTE |
| Letters smoke | PENDING |
| Android PDF pinch zoom | frozen P1/WARN |
| Reply Assistant | dev-track / RC dışı |
| Repo hygiene | DONE |
| **RC decision** | **GO WITH WARN** |

---

## RC Decision: GO WITH WARN

8.1 release candidate: **GO WITH WARN**.

Tüm P0 blocker'lar ya çözüldü ya da RC dışı sınıflandırıldı. Android PDF pinch zoom P1/WARN olarak kayıt altına alındı ve donduruldu — bu kabul edilmiş bir risk, blocker değil.

---

## Smoke Sonuçları

### Scanner — PASS

- VisionCamera load × 2 ✓
- CameraOpen × 2 ✓
- DocScannerLatencyLogs: autoEnhance çalıştı ✓
- FATAL / ANR = 0 ✓

### Privacy Copy — PASS WITH NOTE

- "Alles lokal / on-device only" overclaim: yok ✓
- OCR/server/backend disclosure: mevcut ✓
- Not: DSGVO rights tam hukuki review 8.x backlog'a alındı; bu kalem RC blocker değil.

### Letters Smoke — PENDING

- Test verisi: Radiologie Überweisung kağıdı — Letters için uygun release test datası değil.
- FAIL değil; mevcut oturumda uygun doküman yoktu.
- RC blocker değil.

### OCR Analyse — PASS

- Runtime ConfigGate: apiHost=127.0.0.1, ocrHost=127.0.0.1, deviceIp=127.0.0.1 ✓
- Fiziksel Pixel cihazda OCR Analyse uçtan uca çalıştı ✓

### Reply Assistant — dev-track / RC dışı

- `__DEV__` guard altında — production release APK'sında görünmez.
- Dev-track smoke TODO olarak bırakıldı.
- Production readiness / feature flag / safety UX → 8.6 backlog.
- 8.1 RC gate'i dışında.

---

## Frozen PDF Decision

Android PDF pinch zoom 8.1 için donduruldu. P1/WARN kaydedildi, çözümlenmedi.

**Test edilip başarısız olan fix'ler:**
- Fix 1, Fix 2, Fix 3A, Variant B, Fix 3B — hepsi FAIL
- Fix 3B: doğru APK (SHA256 doğrulandı) ile fiziksel cihazda test edildi → FAIL
- Kök neden: native PDFView `DragPinchManager` multi-touch event'leri JS katmanından önce tüketiyor; RN New Architecture + RNGH `Gesture.Pinch()` hiçbir zaman tetiklenmiyor.

**8.1'de yeni PDF patch/build/test yok.**

**8.2+ backlog:**
- `react-native-pdf-jsi` spike
- AndroidX `PdfRenderer` spike
- WebView/pdf.js evaluation

**8.5+:** Viewer abstraction layer — iOS/Android platform-native path ayrımı.

---

## Committed Fixes

| Hash | Açıklama |
|---|---|
| `8f333c2ec` | fix(android): stabilize release config, OCR timeouts and viewer layout |
| `7038d46a5` | chore(android): ignore Metro-generated drawable assets and raw dir |

---

## Repo Hygiene

### Commit edilmeyenler (kasıtlı)

- `.env.development` — developer-specific IP, machine-specific
- `.env.production` — smoke-only 127.0.0.1, production değil
- `android/app/src/main/AndroidManifest.xml` — cleartext=true smoke-only override

### Ignore edilen generated artifacts

- `android/app/src/main/res/drawable-*/node_modules_*`
- `android/app/src/main/res/drawable-*/assets_brand_*`
- `android/app/src/main/res/raw/`

---

## Önceki RC Durumu (mid-session, artık geçersiz)

Oturum ortasında yazılan notlarda `RC: HOLD` ve "Reply Assistant smoke pending" ibaresi mevcuttu. Bu notlar final karardan önce alınmış ara durum kaydıdır. Geçerli RC kararı yukarıdaki "Final Status" tablosundadır: **GO WITH WARN**.
