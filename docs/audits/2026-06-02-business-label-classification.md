# Audit: P0 #4 — Business/Document Label Sınıflandırması
**Date:** 2026-06-02  
**Status:** AUDIT ONLY  
**Scope:** Behörden/Amt, Sonstiges, Formular, Unbekannt, Dokument

---

## Temel Bulgu

Translation infrastructure **tamamen mevcut** (`documentTypeLabels.ts` + `translations.ts`). Sorun, birkaç UI bileşeninin bu altyapıyı kullanmak yerine hardcoded Almanca string kullanması.

OCR backend `kind` değerleri (form/letter/unknown/invoice) sabit gelir — bunlar pipeline'da normalize edilerek canonical type'a dönüştürülür. **Bu mapping'e dokunulmaz.**

---

## Label Sınıflandırması

### Behörden / Amt

| Alan | Değer |
|---|---|
| Sınıf | MIXED (UI_LABEL + STORED_LEGACY) |
| Kaynak | OCR `kind: form/letter` → `normalizeDocumentTyp()` → `'Behörden / Amt'` (DB'de saklanır) |
| Translation altyapısı | ✅ `doc.type.authority_group` → `translations.ts:856` |

**Hardcoded UI yerleri:**
- `SearchFilterModal.tsx:91` — chip text `'Behörden'` (DB'deki `'Behörden / Amt'` ile inconsistent)
- `useHomeState.ts:23` — mapping key `'Behörden / Amt'` (display değil, data key — OK)

**Aksiyon:** `SearchFilterModal.tsx:91` chip label → `T('doc.type.authority_group')` TRANSLATE  
**Risk:** LOW — sadece bir chip, logic değişmez

---

### Sonstiges

| Alan | Değer |
|---|---|
| Sınıf | STORED_LEGACY (fallback default) |
| Kaynak | OCR sınıflandırma başarısız → pipeline default olarak atanır → DB'de saklanır |
| Translation altyapısı | ✅ `doc.type.other` → `translations.ts:853` |

**Hardcoded UI yerleri:**
- `useDocumentPipeline.ts:39,84,108` — `typ = 'Sonstiges'` atama (data, not display — OK)
- `useSmartDocumentPipeline.ts:130,134,198` — fallback atama (data — OK)
- `archiveDocument.ts:55` — yeni doküman default (data — OK)

**Aksiyon:** YOK — bu değerler data pipeline'da kullanılıyor, UI'da displaygerken `getDocTypeLabel()` altyapısı devreye giriyor.  
**Risk:** ZERO

---

### Formular

| Alan | Değer |
|---|---|
| Sınıf | OCR_CONTENT + UI_LABEL |
| Kaynak | Backend `kind: 'form'` → hardcoded `'Formular'` → DB canonical type |
| Translation altyapısı | ✅ `doc.type.form` → `translations.ts:864` |

**Hardcoded UI yerleri:**
- `ocrMvpToV4Document.ts:17` — `form: 'Formular'` mapping (pipeline data — dokunulmaz)
- `ocrMvpDocumentIdentity.ts:60` — kind label builder (export filename — dokunulmaz)
- `OcrMvpResultCard.tsx:34` — `buildExportFilename` içinde (filename format — dokunulmaz)
- `FormularModal.tsx:25` — modal header `'Formular ausfüllen'` (**UI_LABEL — fix gerekli**)

**Aksiyon:** `FormularModal.tsx:25` başlığı → `T('common.fill_form')` veya mevcut key varsa kullan. Ancak bu modal şu an aktif mi kontrol edilmeli.  
**Risk:** LOW (eğer modal aktifse), ZERO (eğer ENABLE_RELEASE flag ile kapalıysa)

---

### Unbekannt

| Alan | Değer |
|---|---|
| Sınıf | STORED_LEGACY (sender fallback) |
| Kaynak | OCR sender extraction başarısız → `absender: 'Unbekannt'` → DB'de saklanır |
| Translation altyapısı | ✅ `doc.type.unknown` → `translations.ts:854` (ama bu doctype için, sender için ayrı key yok) |

**Hardcoded UI yerleri:**
- `ocrMvpDocumentIdentity.ts:347,364,376,388` — `return 'Unbekannt'` (data production — OK)
- `KommunikationskanalKarte.tsx:15` — sender display (`'Unbekannt'` hardcoded görünüyor — **kontrol gerekli**)
- Pipeline hooks — data default (OK)

**Aksiyon:** `KommunikationskanalKarte.tsx:15` satırını kontrol et. Eğer `absender === 'Unbekannt'` hardcoded string karşılaştırması değil de display ise T() ile çevrilmeli.  
**Risk:** LOW — sender fallback, kullanıcı etkisi sınırlı

---

### Dokument

| Alan | Değer |
|---|---|
| Sınıf | OCR_CONTENT (generic fallback) |
| Kaynak | Backend `kind: 'unknown'` → `'Dokument'` → weak type → refinement bekler |
| Translation altyapısı | ✅ `doc.type.document` → `translations.ts:852` |

**Hardcoded UI yerleri:**
- `ocrMvpToV4Document.ts:21` — `unknown: 'Dokument'` mapping (pipeline data — dokunulmaz)
- `ocrMvpDocumentIdentity.ts:62,66,242` — kind label (filename/export — dokunulmaz)
- `OcrMvpResultCard.tsx:34` — `buildExportFilename` (filename format — dokunulmaz)

**Aksiyon:** YOK — `OcrMvpResultCard` zaten `DOC_TYPE_KEY` + `T()` ile display label üretiyor. `buildExportFilename` içindeki hardcoded string filename için, UI display değil.  
**Risk:** ZERO

---

## Özet: Gerçek Aksiyon Gerektiren Yerler

| # | Dosya | Satır | Sorun | Aksiyon | Risk |
|---|---|---|---|---|---|
| 1 | `SearchFilterModal.tsx` | 91 | `'Behörden'` chip hardcoded, DB'deki `'Behörden / Amt'` ile inconsistent | T() ile çevir veya stored value ile hizala | LOW |
| 2 | `FormularModal.tsx` | 25 | `'Formular ausfüllen'` header hardcoded | T() ile çevir (modal aktifse) | LOW |
| 3 | `KommunikationskanalKarte.tsx` | 15 | `'Unbekannt'` sender display kontrol gerekli | Kontrol et, gerekirse T() | LOW |

**Geri kalanların tümü:** Data pipeline, filename formatter, veya DB storage — bunlar hardcoded kalabilir, translation altyapısı display-time'da devreye giriyor.

---

## Sonuç

P0 #4 beklenenden çok daha küçük bir sorun. Translation altyapısı sağlam, OCR pipeline logic'e dokunulmaz, gerçekten UI'da kullanıcıya yanlış dil gösteren yer 2-3 satır. Store blocker değil, ama temiz kapanması iyi olur.

**Önerilen commit:**
```
fix(i18n): translate hardcoded UI labels in search chip and modals
```

**Scope:** SearchFilterModal.tsx + FormularModal.tsx kontrol + KommunikationskanalKarte.tsx kontrol
