## Metadata
- Date: 2026-06-03
- Scope: search category chip copy and filtering
- Commit: pending

## Problem
- Search chips were technically localized but product copy was weak.
- `Nachweise` was still a top-level chip.
- Turkish search UI could show unnatural copy such as:
  - `Kanıtlar`
  - `Kurum / resmî daire`
- The product decision for top chips is:
  - DE: `Alle`, `Rechnungen`, `Behörden`, `Sonstiges`
  - TR: `Tümü`, `Faturalar`, `Resmî yazılar`, `Diğer`
  - EN: `All`, `Invoices`, `Official letters`, `Other`

## Files touched
- `/Users/bayramgul/bp_canavar_v6_refactor/src/product/canonicalDocTypes.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/components/SearchFilterModal.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`

## What changed
- Replaced top quick chip `Nachweise` with `Sonstiges`.
- Updated advanced search modal scope chips to match the same top-level set.
- Changed `Sonstiges` chip filtering to target the intended generic/other document bucket:
  - `Sonstiges`
  - `Dokument`
  - `Formular`
  - `Unbekannt`
  - `unknown`
- Updated label translations so rendered chip/card/category labels are more natural:
  - TR `doc.type.authority_group` → `Resmî yazılar`
  - TR `doc.type.proofs` → `Belgeler`
  - TR `doc.type.form` → `Formlar`
  - DE `doc.type.authority_group` → `Behörden`
  - EN `doc.type.authority_group` → `Official letters`
  - EN `doc.type.proofs` → `Records`
  - EN `doc.type.form` → `Forms`
- Also aligned FR/ES/RU/AR authority/proofs/form labels to the same calmer product wording.

## Validation
- `npx tsc --noEmit`: PASS
- `git status --short`: clean after commit
- Remaining grep matches for `Nachweise` are out of scope:
  - Finanzamt analysis prompt content
  - not search chip/render UI

## Expected visible result
- TR search chips:
  - `Tümü`
  - `Faturalar`
  - `Resmî yazılar`
  - `Diğer`
- DE search chips:
  - `Alle`
  - `Rechnungen`
  - `Behörden`
  - `Sonstiges`
- EN search chips:
  - `All`
  - `Invoices`
  - `Official letters`
  - `Other`
