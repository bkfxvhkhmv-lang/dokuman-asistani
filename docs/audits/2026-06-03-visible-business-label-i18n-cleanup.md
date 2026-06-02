## Metadata
- Date: 2026-06-03
- Scope: visible Home/Search/Detail business/category/status label leaks
- Commit: pending

## Before
- TR locale could still render legacy business/status labels on compact document surfaces:
  - `Behörden / Amt`
  - `Sonstiges`
  - `Rechnungen`
  - `Formular`
  - `Offen`
  - `In Prüfung`
  - `Zahlungsdaten prüfen`
- These were UI-generated labels or stored workflow/status strings, not OCR body text.

## Files touched
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/legacyBusinessLabels.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/HeroCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeDashboardCards.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentPipelineStatus.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/normalizeDocument.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`

## What changed
- Added a render-time legacy label mapper for:
  - stored German category labels
  - workflow stamp/timeline values
  - open/review/payment-check status strings
  - pipeline state labels
- Wired Home and Detail card/header surfaces to that mapper.
- Localized `normalizeDocument()` next-step fallback labels so consumers do not emit German literals.
- Localized `documentPipelineStatus` fallback labels so pending/processing/open states follow app locale.

## Keys added
- `workflow.stamp.mail`
- `workflow.stamp.appeal`
- `workflow.timeline.paid_today`
- `workflow.timeline.paid_today_partner`
- `workflow.timeline.mail_prepared`
- `workflow.timeline.appeal_prepared`
- `pipeline.label.analyzing`
- `pipeline.label.pending`
- `pipeline.label.processing`
- `pipeline.label.ready`

All new keys were added to:
- DE
- TR
- EN
- FR
- ES
- RU
- AR

## Remaining intentional matches
- Internal constants, regexes, modal/component names, and canonical business data still contain German strings in code.
- These are not visible TR render-path leaks for this task.
- Examples:
  - icon maps / internal keys
  - regex replacements against German canonical labels
  - modal names like `FormularModal`
  - internal selector names containing `Offen`

## Validation
- `npx tsc --noEmit`: PASS
- Scoped grep for target leak terms after excluding translations/tests/internal constant buckets:
  - no remaining screenshot-level render-path leaks in this task scope
- `git status --short`: clean after commit

## Remaining risks
- Screens not in this scope may still contain separate canonical/status constants.
- OCR/raw document body text remains intentionally untranslated.
