# Low-Traffic Runtime I18n Cleanup

## Report Metadata
- Author/Agent: Codex
- Role: low-traffic runtime i18n cleanup
- Date: 2026-06-02
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: f278e15ee
- Task type: fix / validation / docs
- Scope: SmartRiskPanel, smart-risk labels, document chain copy, strategy copy, remaining low-traffic Home/Search chrome
- Status: PASS

## 1. Scope
- Inspected and cleaned remaining low-traffic runtime UI chrome surfaces after the main app-chrome pass.
- Files searched:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartRiskPanel.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/labels.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/services/documentChainEngine.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/product/strategyCopy.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/ozet-tab/KiZusammenfassung.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeDashboardCards.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeRecentList.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/components/SearchHomeView.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- Feature area:
  - low-traffic runtime chrome and strategy/risk copy

## 2. Search commands used
- `git -C /Users/bayramgul/bp_canavar_v6_refactor status --short`
- `sed -n '1,260p' /Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartRiskPanel.tsx`
- `sed -n '1,260p' /Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/services/documentChainEngine.ts`
- `sed -n '1,260p' /Users/bayramgul/bp_canavar_v6_refactor/src/product/strategyCopy.ts`
- `sed -n '1,260p' /Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- `rg -n "RISIKO|Warum\\?|Weniger Details|Alle Risikofaktoren|RECHTLICHE AUFFÄLLIGKEITEN|VERGLEICH MIT ÄHNLICHEN DOKUMENTEN|Dokument geöffnet|Dokument eingegangen|Wird analysiert|Dokumente sicher sortieren|Suche nach Absender|Mahnungen|Verträge|Unvollst\\.|Dokument scannen|Auswählen|Abbrechen" /Users/bayramgul/bp_canavar_v6_refactor/src --glob '!**/translations.ts' --glob '!**/__tests__/**'`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npx tsc --noEmit`

## 3. Files touched
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartRiskPanel.tsx`
  - reason: localized risk panel chrome and peer stats line
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/labels.ts`
  - reason: localized risk level/trend labels through runtime locale
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/services/documentChainEngine.ts`
  - reason: localized chain title, risk labels, fallback status copy, next-step fallbacks
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/product/strategyCopy.ts`
  - reason: replaced hardcoded German strategy constants with runtime locale accessors
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/ozet-tab/KiZusammenfassung.tsx`
  - reason: localized source label in summary sources
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeDashboardCards.tsx`
  - reason: localized dashboard chip labels, deadline snippets, strategy copy usage
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeRecentList.tsx`
  - reason: localized selection/search chrome and document-section strategy copy usage
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/components/SearchHomeView.tsx`
  - reason: localized search mission hint through strategy accessor
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
  - reason: added 7-locale keys for risk, chain, strategy, dashboard chip, common source/why/less
  - type of change: i18n
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-low-traffic-runtime-i18n-cleanup.md`
  - reason: permanent fix report
  - type of change: docs

## 4. Findings
- status: fixed
  - severity: should fix
  - user impact: SmartRiskPanel could still show German runtime chrome in non-German UI
  - technical root cause: hardcoded German labels and section headers in component
  - minimal solution: route panel strings through `useT()`

- status: fixed
  - severity: should fix
  - user impact: risk level/trend labels were language-leaking into any non-German locale
  - technical root cause: `smart-risk-engine/labels.ts` exported fixed German maps
  - minimal solution: generate labels via `t(getLangSync(), key)`

- status: fixed
  - severity: should fix
  - user impact: detail chain step/fallback copy could appear in German regardless of selected UI locale
  - technical root cause: `documentChainEngine.ts` embedded German fallback strings
  - minimal solution: localize chain titles, reasons, next steps, and fallback statuses via runtime translation

- status: fixed
  - severity: should fix
  - user impact: Home/Search runtime strategy copy could remain German
  - technical root cause: `strategyCopy.ts` exported German constants
  - minimal solution: replace with runtime locale accessors and update consumers

- status: fixed
  - severity: later
  - user impact: some remaining Home chrome still leaked German in selection and deadline snippets
  - technical root cause: consumer components still had local hardcoded text after strategy cleanup
  - minimal solution: localize those component-level strings directly

- status: intentional
  - severity: later
  - user impact: generated prose can still remain in its original language where it is actual generated content
  - technical root cause: task intentionally does not auto-translate generated document prose
  - minimal solution: keep structured UI chrome localized and leave generated content untouched

## 5. Decisions
- What was changed:
  - localized SmartRiskPanel chrome
  - localized risk label service
  - localized document-chain fallback copy
  - converted strategy copy exports to runtime locale accessors
  - localized summary source label
  - localized remaining Home/Search selection and dashboard snippets touched by these flows
- What was deliberately not changed:
  - document logic
  - review/Hinweise logic
  - OCR/provider/backend
  - generated official letter content
- Why:
  - task scope was UI chrome purity only

## 6. Validation
- `npx tsc --noEmit`: PASS
- Tests run: none
- Manual checks: source search confirmed targeted hardcoded strings were removed from patched runtime surfaces
- Remaining risks:
  - low-level system alerts and legacy runtime surfaces outside this patch still contain hardcoded text
  - runtime strategy copy is now locale-aware, but generated document prose remains intentionally untranslated

## 7. Commit
- commit hash: f278e15ee
- commit message: `fix(i18n): clean low-traffic runtime language surfaces`

## 8. Follow-ups
- audit remaining hardcoded strings in system-alert helpers such as `useSheet`, backup alerts, upload alerts, and legacy modals
- add focused runtime tests for `strategyCopy` and `smart-risk-engine/labels.ts` locale switching if this area continues to change

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartRiskPanel.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/labels.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/services/documentChainEngine.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/product/strategyCopy.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/ozet-tab/KiZusammenfassung.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeDashboardCards.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeRecentList.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/components/SearchHomeView.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-low-traffic-runtime-i18n-cleanup.md`

Follow-up owner suggestion:
- Codex: remaining system-alert and legacy modal language cleanup
