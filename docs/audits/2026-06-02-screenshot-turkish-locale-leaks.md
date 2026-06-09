# 2026-06-02 Screenshot Turkish Locale Leaks

## Before
- Turkish locale screenshots still showed German UI chrome on detail/result surfaces.
- Two raw/fallback leak vectors were visible:
  - `ocr.result.show_fields`
  - `risk.trend.stabil`
- Feedback sheet, detail next-step/review helper copy, and document-understand modal errors still leaked visible German text.

## Files Touched
- `src/components/BelgeAciklamaModal.tsx`
- `src/features/detail/components/ActionsPanel.tsx`
- `src/features/feedback/FeedbackModal.tsx`
- `src/i18n/translations.ts`
- `src/utils/detailNextStep.ts`

## Keys Added Or Reused
- Reused existing localized keys where coverage already existed:
  - `ocr.result.show_fields`
  - `settings.feedback`
  - `reply.copy`
  - `reply.share`
  - `common.close`
  - `common.retry`
- Added runtime/fallback coverage for screenshot-facing keys used by the updated render paths:
  - `feedback.*` screen/category/error/privacy keys
  - `modal.understand_doc.error.*`
  - `detail.actions.hint.*`
  - `detail.review.*`
  - `risk.trend.stabil`

## Validation
- `npx tsc --noEmit`: PASS
- Exact screenshot-locale grep after the fix is **not zero**.

### Remaining grep matches
The remaining matches are dominated by out-of-scope domain/config/business constants and legacy non-screenshot surfaces, for example:
- canonical type/config registries:
  - `src/constants/docTypeConfig.ts`
  - `src/product/canonicalDocTypes.ts`
- OCR/storage/business constants:
  - `src/features/ocr-mvp/adapters/*`
  - `src/hooks/useSmartDocumentPipeline.ts`
  - `src/modules/scanner/flow/archiveDocument.ts`
- legacy/supporting surfaces not part of this screenshot pass:
  - onboarding/demo content
  - help/institution directories
  - smart categorization constants

Those remaining matches were not part of the user-requested screenshot-visible Turkish locale patch and were not changed here to avoid mixing i18n copy cleanup with document/business logic.

## Result
Closed screenshot-visible Turkish locale leaks on the requested render paths:
- raw key leak path for OCR result field preview button
- feedback modal chrome, categories, placeholders and alerts
- detail next-step helper labels
- detail action helper/review copy
- document-understand modal error states and close accessibility label

## Commit
- `fix(i18n): sweep screenshot-found Turkish locale leaks`
