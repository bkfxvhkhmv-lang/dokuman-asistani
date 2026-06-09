# Android 8.0 → 8.1 Release Hygiene Checklist

**Tarih:** 2026-06-06  
**Kapsam:** Commit separation, release wording, beta blockers, public blockers  
**Durum:** Docs only — no code, no build, no commits, no staging

---

## 1. Current Working Tree State

```
M  .env.development                                    ← DEV ONLY — do not commit to release branch
M  android/gradle.properties                           ← device/build config — review before commit
M  src/features/ocr-mvp/OcrMvpScreen.tsx              ← OCR redesign WIP
M  src/features/ocr-mvp/components/OcrMvpActionSummary.tsx  ← OCR redesign WIP
M  src/features/ocr-mvp/components/OcrMvpResultCard.tsx     ← OCR redesign WIP
M  src/features/ocr-mvp/components/OcrMvpUploadBox.tsx      ← OCR redesign WIP
M  src/i18n/translations.ts                           ← OCR redesign WIP (new keys + copy fix)
?? docs/audits/2026-06-06-android-8-functional-pass-visual-warn-audit.md  ← audit doc, untracked
```

---

## 2. Proposed Commit Separation

### Commit A — Audit Documentation

**Scope:** Docs only. No code, no config.

**Safe to include:**
- `docs/audits/2026-06-06-android-8-functional-pass-visual-warn-audit.md`
- `docs/audits/2026-06-06-android-8-release-hygiene-checklist.md` (this file)

**Proposed commit message:**
```
docs: Android 8.0 VQA audit + 8.1 release hygiene checklist

Frame-by-frame VQA (Pixel 9 Pro, Android 15, build 8.0 internal).
Verdict: PASS with WARN for internal, BLOCKED for 8.1 beta.
Records functional PASS evidence and P0/P1 visual blockers separately.
No code changes.
```

**Must NOT include in this commit:**
- Any `.tsx` / `.ts` source files
- `.env.development`
- `android/gradle.properties`
- Any native or build config

---

### Commit B — OCR Result Screen Compact Redesign

**Scope:** UI patch only. No backend, no OCR logic, no native.

**Safe to include:**
- `src/features/ocr-mvp/OcrMvpScreen.tsx`
- `src/features/ocr-mvp/components/OcrMvpResultCard.tsx`
- `src/features/ocr-mvp/components/OcrMvpActionSummary.tsx`
- `src/features/ocr-mvp/components/OcrMvpUploadBox.tsx`
- `src/i18n/translations.ts`

**Proposed commit message:**
```
fix(ocr): compact result screen — suppress upload box in done state

- status === done: full OcrMvpUploadBox no longer rendered below result card
- compact new-analysis block replaces standalone Neue Analyse reset button
- success chip + saved badge consolidated into single status line
- secondary actions (Datenvorschau, Als Excel exportieren) visually smaller
- new translation key: ocr.result.new_doc_helper (7 locales)
- DE copy: "Excel herunterladen" → "Als Excel exportieren"
- tsc: 0 errors

Visual approval required before merge.
```

**Must NOT include in this commit:**
- `.env.development`
- `android/gradle.properties`
- Audit docs
- Any backend, OCR extraction, or native file

---

### Files That Must Stay Out of Both Commits (Until Explicitly Approved)

| Dosya | Neden |
|-------|-------|
| `.env.development` | Device IP, API endpoint, debug flags — never commit to feature branch |
| `android/gradle.properties` | `BUNDLE_IN_DEBUG=true`, build flags — review what changed before staging |

**Risk:** If `.env.development` is accidentally committed, local device IP and API base URL leak into git history. If `android/gradle.properties` includes a dev-only flag (e.g. `BUNDLE_IN_DEBUG`), it may ship to a build that shouldn't have it.

---

## 3. Release Wording — What to Say and What Not to Say

### Approved wording

| Context | Doğru ifade |
|---------|-------------|
| Android 8.0 verdict | "PASS with WARN — internal only" |
| 8.0 scope | "Android 8.0 internal test build, Pixel 9 Pro cihazda doğrulandı" |
| Beta readiness | "8.1 limited beta için P0/P1 kalemler kapatılmadan geçilemez" |
| Public readiness | "Public rollout: NOT READY" |
| Reply Assistant | "Dev akışı internal'da gözlemlendi — production-ready değil" |

### Do NOT use these phrasings

| Kaçınılacak ifade | Neden |
|-------------------|-------|
| "production-ready" | Hiçbir 8.0 build'i production-ready değil |
| "beta-ready" | P0/P1 kalemler kapanmadan beta söylenemez |
| "güvenli / yasal / onaylandı" | Reply Assistant dahil hiçbir akış için bu ifade kullanılamaz |
| "rechtssicher / anwaltlich geprüft / garantiert" | Kesinlikle kullanılamaz — içerik veya metadata'da bile olsa |
| "OCR sonuçları doğrudur" | Amber Hinweis sistemi doğruluğu garanti etmiyor, yalnızca şüpheli alanları işaretliyor |
| "8.0 tamamlandı" | PASS with WARN — "tamamlandı" overclaim |

---

## 4. 8.1 Limited Beta Blockers

Bunların tamamı kapatılmadan 8.1 limited beta dağıtımı yapılamaz:

| # | Blocker | Öncelik | Durum |
|---|---------|---------|-------|
| 1 | **[DEV] label ve şablon ID sızdırma** — Reply Assistant'ta "[DEV] Vorlagenkandidaten", "[DEV] Antrag auf Akteneinsicht", "[DEV] Entwurfsvorschau" + dahili ID'ler harici kullanıcıya görünüyor | **P0** | Açık |
| 2 | **Datenschutz / Privacy copy** — "Deine Daten bleiben auf deinem Gerät" yanıltıcı; OCR verisi harici API'ye gönderiliyor | **P1** | Açık |
| 3 | **ABSENDER / Briefkopf çıkarım tutarsızlığı** — ham OCR'da "Gemeinschaftspraxis" var; ABSENDER "Unbekannt" kalıyor | **P1** | Açık |
| 4 | **OCR result ekran hierarchy** — compact redesign patch tamamlandı (2026-06-06): static review PASS, tsc PASS, scanner entry PASS; cihaz smoke bekleniyor | **P1 ✅ visual gate PASSED** | WIP — cihaz smoke bekleniyor |
| 5 | **Language screen debug warning + CTA safe-area** — "Open debugger to view warnings" toast; CTA konumu safe-area dışına taşıyor | **P1** | Açık |
| 6 | **Keyboard / safe-area form usability** — Reply Assistant form alanları klavye açıkken görünüm alanına gömülüyor; Schließen butonu kaybolabiliyor | **P1** | Doğrulama eksik |
| 7 | **Android scanner dismiss/resume lifecycle** — camera dismiss/back siyah ekran veya belirsiz UI state üretebiliyor; tarama sırasında veya analiz başlamadan önce ekran kilidi tetiklenebiliyor. AC-1..AC-7 doğrulaması zorunlu | **P1 NO-GO** | Açık |

### 4.1 Acceptance Criteria — Android Scanner Lifecycle (AC-1..AC-7)

Aşağıdakilerin **tamamı** Pixel 9 Pro'da geçmeden scanner lifecycle NO-GO kapatılmış sayılmaz:

```
[ ] AC-1  Scan başlat → fiziksel Geri bas → Upload Box veya Result Card görünür
          Kabul: siyah ekran yok, app state tutarlı
          Red:   siyah ekran, frozen UI, crash

[ ] AC-2  Scan başlat → OS dismiss (kamera × / swipe down) → Upload Box veya Result Card görünür
          Kabul: siyah ekran yok, app state tutarlı
          Red:   siyah ekran, frozen UI

[ ] AC-3  Scan aktifken veya OCR processing sırasında ekran kilidi tetiklenmiyor
          Kabul: kamera veya analiz ekranında cihaz kilitlenmiyor
          Red:   ekran kilidi devreye giriyor ve OCR akışı sıfırlanıyor

[ ] AC-4  "Analyse abbrechen" butonu uploading/processing sırasında görünür ve çalışıyor
          Kabul: butona bas → Upload Box idle'a döner, analiz job temizlenir
          Red:   buton yok; × basmak ekrandan tamamen çıkış yapıyor

[ ] AC-5  File picker (DocumentPicker) cancel → Upload Box veya Result Card korunuyor
          Kabul: state bozulmadı, siyah ekran yok
          Red:   state sıfırlandı veya ekran siyah

[ ] AC-6  Photo library (pickFromLibrary) cancel → Upload Box veya Result Card korunuyor
          Kabul: state bozulmadı, siyah ekran yok
          Red:   state sıfırlandı veya ekran siyah

[ ] AC-7  Result card → "Scannen" → cancel → Result Card görünür, handleReset çağrılmadı
          Kabul: result card görünür, önceki analiz sonucu korunuyor
          Red:   result card kayboluyor, siyah ekran, veya handleReset erken tetiklendi
```

---

## 5. Public Rollout Blockers

8.1 blockerlarına ek olarak public release için şunlar da kapatılmalı:

| # | Blocker |
|---|---------|
| 8 | **Reply Assistant production-ready değil** — template kapsam, hukuki inceleme, direct sending akışı eksik |
| 9 | **Feature flag / kill-switch** — Reply Assistant ve OCR API için remote kill-switch hazır değil |
| 10 | **Monitoring / crash reporting** — production traffic için yeterli gözlemlenebilirlik kurulmadı |
| 11 | **Consent gates** — DSGVO/KVKK uyumlu onay akışı ve privacy policy güncel değil |
| 12 | **Beta doğrulaması tamamlanmadı** — 8.1 limited beta verisi olmadan public geçilemez |

---

## 6. Risks If Commits Are Mixed

| Risk | Senaryo | Sonuç |
|------|---------|-------|
| **Audit doc + OCR patch aynı commit'te** | Docs commit'i OCR kod değişikliği içeriyor | Commit history karışık; revert edilirse kod ve doc birlikte gidiyor |
| **`.env.development` yanlışlıkla stage'e alınır** | `git add .` ile toplu staging | Device IP, API base URL, debug flag git geçmişine girer; temizlemesi pahalı |
| **`android/gradle.properties` release build'e karışır** | `BUNDLE_IN_DEBUG=true` veya dev client flagleri | Internal-only debug davranışı beta/production APK'ya girer |
| **Audit doc "PASS" olarak yorumlanır** | "Functional PASS" kısmı okunur, "with WARN" ve "internal only" kısmı atlanır | Erken beta veya public kararı alınır |
| **OCR patch visual approval olmadan merge edilir** | tsc temiz, ama cihazda görsel doğrulama yapılmamış | Regresyon fark edilmeden beta'ya taşınabilir |

---

## 7. Recommended Next Order (Before Any Commit)

```
1. [✅ DONE]  OCR result compact redesign visual gate
               → static review PASS, tsc PASS, scanner entry PASS
               → cihaz smoke henüz tamamlanmadı

2. [ ] Codex scanner lifecycle fix (Fix-2 — NO-GO blocker)
         → camera dismiss/back → siyah ekran fix
         → ekran kilidi tarama/OCR sırasında engelle
         → "Analyse abbrechen" CTA ekle (uploading/processing state)
         → scope: ExpoScannerProvider / camera lifecycle / OcrMvpStatusCard

3. [ ] tsc --noEmit → 0 hata doğrula

4. [ ] Static review — scanner lifecycle diff (Cursor)

5. [ ] Pixel 9 Pro device smoke — AC-1 through AC-7
         → AC-1: scan → Geri → Upload Box/Result Card görünür, siyah ekran yok
         → AC-2: scan → OS dismiss → Upload Box/Result Card görünür
         → AC-3: kamera/OCR sırasında ekran kilidi tetiklenmiyor
         → AC-4: "Analyse abbrechen" görünür ve upload box'a döndürüyor
         → AC-5: file picker cancel → state korunuyor
         → AC-6: photo library cancel → state korunuyor
         → AC-7: result card → scan → cancel → result card korunuyor

6. [ ] Pixel 9 Pro manuel smoke — OCR result redesign
         → Full upload box yok (done state'de)
         → Compact new-analysis block görünüyor
         → Primary/secondary hiyerarşi doğru
         → "Als Excel exportieren" copy doğru

7. [ ] SONRA: Commit A — docs/audit (sadece .md dosyaları)

8. [ ] SONRA: Commit B — OCR redesign patch (sadece src/ değişiklikleri, onay verildi ise)

9. [ ] SONRA: Commit C — scanner lifecycle fix (sadece scanner/camera scope src/ değişiklikleri)

10. [ ] .env.development ve android/gradle.properties — ayrıca değerlendirmeye al,
          commit edilip edilmeyeceğine ayrıca karar ver
```

---

## 8. Exact "Do Not Include" List (Quick Reference)

```
# Bu dosyalar hiçbir release commit'ine girmemeli (açık onay olmadan):
.env.development
android/gradle.properties

# Bu dosyalar docs commit'ine girmemeli:
src/features/ocr-mvp/OcrMvpScreen.tsx
src/features/ocr-mvp/components/OcrMvpResultCard.tsx
src/features/ocr-mvp/components/OcrMvpActionSummary.tsx
src/features/ocr-mvp/components/OcrMvpUploadBox.tsx
src/i18n/translations.ts

# Bu dosyalar OCR patch commit'ine girmemeli:
docs/audits/*.md
.env.development
android/gradle.properties
```

---

*Docs only — hiçbir dosya stage edilmedi, commit yapılmadı.*
