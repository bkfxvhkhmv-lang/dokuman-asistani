# Fix: Search Category Labels i18n
**Date:** 2026-06-03  
**Commit:** 1ffa54ef1  
**Status:** FIXED

## Root Cause

`doc.type.invoice_plural`, `doc.type.authority_group`, `doc.type.proofs` existed only in DE/TR/EN.  
FR/ES/RU/AR fell back to English (EN dict fallback in `t()` function).  
`BudgetTargetModal` used a static German array `PRESET_TARGETS`.

## Fixed

### 1. Search chip keys — FR/ES/RU/AR
Added to all 4 locales:
- `doc.type.invoice_plural` — Factures / Facturas / Счета / فواتير
- `doc.type.authority_group` — Autorités/bureaux / Autoridades/oficina / Органы/ведомства / السلطات/المكاتب
- `doc.type.proofs` — Preuves / Pruebas / Доказательства / براهين

### 2. BudgetTargetModal preset labels
- Removed static `PRESET_TARGETS` with hardcoded German
- Added `PRESET_LABEL_KEYS` → T() lookup at render time
- New keys: `budget.preset.total`, `budget.preset.contracts` (7 locales each)
- `doc.type.invoice_plural`, `doc.type.insurance` reused for Rechnungen/Versicherungen

## Already Correct (no change needed)
- `SearchCategoryChips.tsx` — already uses `translateDocumentTypeLabel(label, lang)` ✅
- `SearchFilterModal.tsx` — already uses `T('doc.type.invoice_plural')` etc. ✅
- `DokumentKarte.tsx` — already uses `translateDocumentTypeLabel` for home cards ✅

## Not Translated (business logic data, correct as-is)
- `DocumentClassifier.ts`, `canonicalDocTypes.ts` — type IDs, not display strings
- `smart-categorization/constants.ts` — OCR classification patterns
- `displaySanitizer.ts` — regex matching canonical German type names
