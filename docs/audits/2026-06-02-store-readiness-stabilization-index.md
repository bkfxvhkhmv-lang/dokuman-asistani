# Store Readiness Stabilization Index
**Date:** 2026-06-02  
**Branch:** feature/ocr-api-integration  
**Status:** STORE CANDIDATE — 13/13 sorun kapalı, smoke doğrulaması bekliyor

---

## Özet

Bu sprint boyunca tespit edilen 13 ana sorunun tamamı kapatıldı.  
Store blocker kalmadı. Geriye yalnızca clean-pass backlog ve cihaz smoke doğrulaması kaldı.

| Kategori | Kapalı | Kısmen | Açık |
|---|---|---|---|
| P0 (kritik) | 4 | 0 | 0 |
| P1 (önemli) | 4 | 0 | 0 |
| P2 (polish) | 5 | 0 | 0 |
| **Toplam** | **13** | **0** | **0** |

---

## Kapanan Sorunlar

### P0 — Kritik

| # | Sorun | Commit | Dosyalar |
|---|---|---|---|
| #1 | `ocr.result.data_preview` raw key | e22e9286e | OcrMvpResultCard.tsx |
| #2 | `ocr.result.saved_badge` raw key | e22e9286e | OcrMvpResultCard.tsx |
| #3 | `risk.trend.stabil` raw key | e22e9286e | translations.ts |
| #4 | Business/document label karışımı | 30a73c8d5 | SearchFilterModal.tsx |

### P1 — Önemli

| # | Sorun | Commit | Dosyalar |
|---|---|---|---|
| #5 | Detail ekranında tab bar görünüyordu | 1c29fe7a0 | DetailScreen.tsx |
| #6 | OCR save sonrası aksiyon hiyerarşisi zayıftı | 4d6e1c708 | OcrMvpResultCard.tsx |
| #7 | Profil/settings yüzey tutarsızlığı | b1e70a0fc | Profilbildschirm.tsx |
| #8 | Empty state aktif filtreyi tekrar öneriyordu | cdb0c030e | SearchScreen / empty state |

### P2 — Polish

| # | Sorun | Commit | Dosyalar |
|---|---|---|---|
| #9 | Search list'te bottom tab bar overlap | cdb0c030e | SearchScreen.tsx |
| #10 | Detail action yoğunluğu (Edit/Löschen) | 9250bc272 | DetailsPanel.tsx, DetailActionsTab.tsx |
| #11 | Analysis duplicate status copy | e7de72ab1 | — |
| #12 | Profile footer version text glow overlap | 762683c1e | EinstellungenScreen.tsx |
| #13 | Long field / IBAN wrap + radius | feba9594c | — |

---

## İmza ve Scanner Sprint'i

13 ana sorun listesinin dışında, bu sprint'te imza ve scanner tarafında da kritik işler tamamlandı:

| İş | Commit |
|---|---|
| Android native ML Kit scanner guard | e55dcfa75 |
| PDF imzala action'ı işlemler paneline eklendi | 308609cff |
| İmzalı PDF kayıt sonrası görünürlük fix | db6174328 |
| Kaydet sonrası fullscreen açma / popup kaldırma | 4d1243302 |
| Signature PDF sheet i18n | b9faebe8c |

---

## i18n Sprint'i

| İş | Commit |
|---|---|
| Screenshot-driven TR locale leak sweep | 600b7918a |
| İkinci TR locale leak sweep | cad48a972 |
| Raw key + action/search/OCR surface sweep | e22e9286e |
| Search filter chip raw key fix | 30a73c8d5 |
| Runtime prose localization (earlier Codex passes) | codex commits |
| Residual i18n sweep / guardrails | codex commits |

---

## Validation

```
npx tsc --noEmit   → EXIT:0
git status --short → clean (no dirty files)
```

**Android dev build notu:**  
Expo Go bu projeyi tam test edemez (native modüller: react-native-pdf, expo-notifications).  
Dev build için gerekli ortam:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME=/Users/bayramgul/Library/Android/Sdk
export ANDROID_SDK_ROOT=/Users/bayramgul/Library/Android/Sdk
npx expo run:android
```

---

## Cihaz Smoke Checklist

Store öncesi gerçek cihazda doğrulanması gereken akışlar:

- [ ] Android ML Kit native scanner açılıyor, perspective-corrected çıktı üretiyor
- [ ] OCR result → Kaydet → "Dokument öffnen" dominant, Neue Analyse ikincil
- [ ] Detail: Özet / Analiz / Eylem / Doküman tab geçişleri çalışıyor
- [ ] Detail: Tab bar artık görünmüyor (bottom nav gizli kalıyor)
- [ ] Detail: Geri dönünce tab bar geri geliyor
- [ ] PDF imzala → imza ekle → kaydet → imzalı PDF fullscreen açılıyor
- [ ] Search empty state aktif filtreyi tekrar önermemiyor
- [ ] Search bottom tab overlap yok
- [ ] TR locale'de ekran görüntüsü — raw key / Türkçe leak yok
- [ ] Profile ekranı: mavi blok yok, Settings ile görsel tutarlı
- [ ] Settings version text scan glow'u altında ezilmiyor
- [ ] Home / Search / Profil / Einstellungen tab geçişleri sorunsuz

---

## Kalan Non-Blocking Backlog

Store sonrası clean-pass için:

| Dosya | Sorun | Çözüm |
|---|---|---|
| `FormularModal.tsx:25` | `"Formular ausfüllen"` hardcoded | T() key + 7 locale çevirisi |
| `KommunikationskanalKarte.tsx` | 4 hardcoded DE string | useT() ekle + 7 locale çevirisi |

Bu iki dosya için yeni key'ler translations.ts'e eklenmesi gerekiyor — kapsamı küçük ama 7 locale coverage zorunlu. Store öncesi blocker değil.

---

## Sonuç

Ana 13 sorun kapalı. TypeScript hatası yok. Repo temiz.  
**Sonraki adım: cihaz smoke → store submission kararı.**
