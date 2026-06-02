# Runtime Prose Localization

## Report Metadata
- Author/Agent: Codex
- Role: runtime prose localization follow-up
- Date: 2026-06-02
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: pending
- Task type: fix / validation / docs
- Scope: smart risk engine prose, detail next-step prose, enhancement recommendation prose, risk consumer views
- Status: FOLLOW-UP COMPLETE

## 1. Scope
- Inspected and localized engine-driven user-facing prose for:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/explanation.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/factors.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/reductions.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/peerComparison.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/runEngine.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/types.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartRiskPanel.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/RiskPanel.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/detailNextStep.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/NaechsterSchrittCard.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/enhancement-panel/recommendation.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/enhancement-panel/EnhancementPanelView.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- Explicitly left out of scope:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/OptimisticDokumentKarte.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/ScannerView.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/riskAnalysis.ts`

## 2. Search commands used
- `rg --files /Users/bayramgul/bp_canavar_v6_refactor/src | rg "RiskPanel\\.tsx|recommendation\\.ts|enhancement-panel|detailNextStep|smart-risk-engine"`
- `rg -n "result\\.trendLabel|f\\.beschreibung|v\\.beschreibung|peerComparison\\.beschreibung|buildErklaerung\\(|buildReductionSuggestions\\(|buildPeerComparison\\(|deriveNaechsterSchrittSatz\\(|deriveNaechsterSchrittZeile\\(" /Users/bayramgul/bp_canavar_v6_refactor/src`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npx tsc --noEmit`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npm test -- --runInBand src/__tests__/SmartRiskEngineService.test.ts`
- `rg -n "Risikobewertung unvollständig|Dieses Dokument wirkt unkritisch|Bitte Frist und nächsten Schritt kurz prüfen|Zahlung sofort ausführen|Risiko höher als bei|OCR-Risiko erkannt|Rechtliches Risiko|Verdächtige Praktiken|Vertragsrisiken|Frist ist abgelaufen|Einige Angaben kurz prüfen|Angaben wurden nicht vollständig erkannt|Auto Enhance|Starke Optimierung empfohlen|Schnell-Presets|MANUELLE ANPASSUNGEN|Vorschau wird erstellt|Enhancement anwenden" /Users/bayramgul/bp_canavar_v6_refactor/src --glob '!**/translations.ts' --glob '!**/__tests__/**' | grep -v "OptimisticDokumentKarte\\|ScannerView\\|riskAnalysis"`

## 3. Files touched
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/types.ts`
  - reason: switched engine-facing prose payloads from raw strings to key/params fields
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/explanation.ts`
  - reason: engine now returns explanation key/params instead of localized prose
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/factors.ts`
  - reason: factor descriptions now return translation keys/params
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/reductions.ts`
  - reason: reduction suggestions now return translation keys/params
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/peerComparison.ts`
  - reason: peer comparison prose now returns translation keys/params
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/runEngine.ts`
  - reason: risk engine result now carries key-based prose fields
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartRiskPanel.tsx`
  - reason: renders all engine-driven prose via `useT()`
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/RiskPanel.tsx`
  - reason: localized remaining low-traffic risk panel chrome
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/detailNextStep.ts`
  - reason: migrated next-step prose to `getLangSync()+t()`
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/NaechsterSchrittCard.tsx`
  - reason: localized heading and updated prose suppression checks
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/enhancement-panel/recommendation.ts`
  - reason: recommendation payload now returns `titleKey`/`descriptionKey`
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/enhancement-panel/EnhancementPanelView.tsx`
  - reason: renders enhancement prose via `useT()`
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
  - reason: added runtime prose keys used by risk/detail/enhancement flows
  - type of change: i18n
- `/Users/bayramgul/bp_canavar_v6_refactor/src/__tests__/SmartRiskEngineService.test.ts`
  - reason: adapted test to key-based explanation model
  - type of change: test
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-runtime-prose-localization.md`
  - reason: permanent report
  - type of change: docs

## 4. Findings
- status: fixed
  - severity: should fix
  - user impact: smart-risk engine could emit German prose directly into non-German UI
  - technical root cause: engine returned user-facing strings instead of stable translation keys
  - minimal solution: return key/params payloads and translate in UI at render time

- status: fixed
  - severity: should fix
  - user impact: detail next-step guidance ignored UI locale
  - technical root cause: `detailNextStep.ts` embedded German guidance strings
  - minimal solution: switched to `getLangSync()+t()`

- status: fixed
  - severity: should fix
  - user impact: enhancement recommendation and controls leaked German in runtime panel chrome
  - technical root cause: recommendation payload and panel labels were hardcoded
  - minimal solution: recommendation returns keys, panel renders through `useT()`

- status: intentional
  - severity: later
  - user impact: three known grep matches remain elsewhere
  - technical root cause: explicitly out-of-scope files for this commit
  - minimal solution: clean in a later small i18n pass

- status: later
  - severity: later
  - user impact: some newly added runtime prose keys still rely on locale fallback outside `de/tr/en`
  - technical root cause: this follow-up prioritized active runtime wiring first
  - minimal solution: fill remaining locale-specific translations in a dedicated key-completion pass if required

## 5. Decisions
- What was changed:
  - engine prose paths now emit keys/params
  - UI consumers now call `T(key, params)` at render time
  - enhancement recommendation payload uses `titleKey/descriptionKey`
- What was deliberately not changed:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/OptimisticDokumentKarte.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/ScannerView.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/riskAnalysis.ts`
- Why:
  - these were explicitly out of scope for this commit

## 6. Validation
- `npx tsc --noEmit`: PASS
- `npm test -- --runInBand src/__tests__/SmartRiskEngineService.test.ts`: FAIL
  - reason: existing Jest environment issue, `@react-native-async-storage/async-storage` native module is null in this test runner
  - impact: not caused by the runtime prose localization patch itself
- Scope-filtered grep:
  - no matches in this patch scope
  - remaining matches are outside scope:
    - `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/scanStrings.ts`
    - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-suggestions/documentSuggestions.ts`
    - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-notifications/notifyContent.ts`
- Remaining risks:
  - locale-specific prose coverage for all 7 languages is not fully exhaustive for the newly added key set

## 7. Commit
- commit hash: pending
- commit message: `fix(i18n): complete runtime prose localization`

## 8. Follow-ups
- add AsyncStorage Jest mock or test setup so runtime i18n engine tests can execute in CI
- finish locale-specific translations for the new runtime prose keys in `fr/es/ru/ar` if 7/7 wording purity is required on these low-traffic surfaces
- clean the next out-of-scope i18n surfaces:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/OptimisticDokumentKarte.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/ScannerView.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/riskAnalysis.ts`

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/types.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/explanation.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/factors.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/reductions.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/peerComparison.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/runEngine.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartRiskPanel.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/RiskPanel.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/detailNextStep.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/NaechsterSchrittCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/enhancement-panel/recommendation.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/scan/components/enhancement-panel/EnhancementPanelView.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/__tests__/SmartRiskEngineService.test.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-runtime-prose-localization.md`
