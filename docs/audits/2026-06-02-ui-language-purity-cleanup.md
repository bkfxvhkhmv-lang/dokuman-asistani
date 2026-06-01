# UI Language Purity Cleanup

## Report Metadata
- Author/Agent: Codex
- Role: UI language purity cleanup
- Date: 2026-06-02
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: pending
- Task type: fix / audit / validation
- Scope: i18n and visible UI chrome only
- Status: PARTIAL

## 1. Scope
- Inspected UI locale source:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/hooks/useT.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/langConfig.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/speechUiStrings.ts`
- Confirmed 7 supported UI locales:
  - `tr`, `en`, `fr`, `de`, `es`, `ru`, `ar`
- Focused on high-traffic visible surfaces:
  - Home
  - Search/Ara
  - compact document cards
  - detail chrome
  - speech / read-aloud
  - OCR MVP result chrome
  - settings language cards
  - delete / more-menu UI

## 2. Search Commands Used
- `rg -n "useT\\(|useTranslation|locale|language|aiLanguage|speech|Vorlesen|Belgeyi|Gönderen|Tarih|Genel Bakış|İşlemler|offene Hinweise|Alle anzeigen|Angaben prüfen|Sonstiges|Dokument löschen|Zusammenfassung|Giriş Yap|Yedek|Gizlilik|Kural Mağazası" src`
- `rg -n "offene Hinweise|Alle anzeigen|Angaben prüfen|Bitte Zahlen|Einige Zeichen|Zusammenfassung|Niedrig|Warum|Dokument löschen|Gönderen|Tarih|Genel Bakış|İşlemler|Belgeyi dinle|Kritik aksiyonları|Belge bilgilerini|Belgelerim|Yedek|Giriş Yap|Kural Mağazası|Gizlilik Politikası" src`
- `npx tsc --noEmit`
- `git diff --name-only`

## 3. Files Touched
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
  - reason: added missing UI chrome keys and 7-locale coverage for the new strings
  - type: i18n
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/speechUiStrings.ts`
  - reason: remove TR/DE-only speech UI fallback and support all 7 UI locales
  - type: i18n
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/documentTypeLabels.ts`
  - reason: translate weak/generic document type labels at render time without mutating stored docs
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentGuards.ts`
  - reason: localize review labels used by UI
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/deriveNextStep.ts`
  - reason: localize next-step labels used by compact cards
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/listCardSummary.ts`
  - reason: suppress compact generated prose when `detectedLanguage` differs from the current UI locale
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`
  - reason: localized badge labels and compact summary gating
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeTriage.tsx`
  - reason: replaced hardcoded German chrome with translation keys
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeUrgencyBanner.tsx`
  - reason: localized CTA label
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeSelectionBar.tsx`
  - reason: localized selection bar chrome
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/components/SearchHeader.tsx`
  - reason: localized search placeholder
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/components/SearchHomeView.tsx`
  - reason: localized quick search and recent-search chrome
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/components/SearchFilterModal.tsx`
  - reason: localized visible filter chrome
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/profile/components/LanguageCards.tsx`
  - reason: remove hardcoded German labels/hints from language settings cards
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/settings/EinstellungenScreen.tsx`
  - reason: localized TTS note under the AI language section
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartSummaryCard.tsx`
  - reason: localized summary title, source labels, tabs, loading label
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/DocumentSpeechSection.tsx`
  - reason: localized read-aloud section chrome
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/AnalyseHeaderCard.tsx`
  - reason: localized trust label and translated weak document type labels
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/HeroCard.tsx`
  - reason: localized hero trust copy and translated weak document type labels
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/SimpleDocumentOverview.tsx`
  - reason: localized simple-layout chrome
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/DetailsPanel.tsx`
  - reason: localized section titles, edit/export/delete chrome
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/details-panel/FieldRow.tsx`
  - reason: localized missing/review field badges
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/details-panel/OcrConfidenceSection.tsx`
  - reason: localized OCR warning messages
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/DocumentAnalysisProgressCard.tsx`
  - reason: localized progress card chrome
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/ozet-tab/KiZusammenfassung.tsx`
  - reason: localized email/source toggle chrome
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/useDetailMoreItems.ts`
  - reason: localized more-menu item labels
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/detail-modals/MoreMenuSheet.tsx`
  - reason: localized section labels and “show all” chrome
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/modals/LoeschenModal.tsx`
  - reason: localized pending delete sheet
  - type: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/components/OcrMvpActionSummary.tsx`
  - reason: localized OCR result card action labels and weak doc-type chrome
  - type: code

## 4. Findings
- status: fixed
  - severity: blocker
  - user impact: high-traffic Home/Search/Detail surfaces showed mixed German or Turkish strings regardless of selected app locale
  - technical root cause: multiple visible components bypassed `useT()` and rendered hardcoded strings directly
  - minimal solution: route those surfaces through translation keys

- status: fixed
  - severity: should fix
  - user impact: speech/read-aloud UI only supported TR/DE and fell back incorrectly for other locales
  - technical root cause: `speechUiStrings.ts` only contained Turkish and German rows
  - minimal solution: add all 7 UI locales there

- status: fixed
  - severity: should fix
  - user impact: compact cards could show generated prose in a language different from the selected UI locale
  - technical root cause: compact summary excerpt ignored `detectedLanguage`
  - minimal solution: suppress compact generated prose when `detectedLanguage` and UI locale do not match

- status: fixed
  - severity: should fix
  - user impact: weak generic type labels like `Dokument` / `Sonstiges` leaked into non-German UI
  - technical root cause: render-time type surfaces reused German display labels directly
  - minimal solution: add a render-time type label translator without mutating stored documents

- status: later
  - severity: should fix
  - user impact: some lower-traffic runtime surfaces still have hardcoded German copy
  - technical root cause: not all risk/timeline/service copy was converted in this pass
  - minimal solution: follow-up on `SmartRiskPanel`, `smart-risk-engine/labels.ts`, `documentChainEngine.ts`, and remaining strategy-copy surfaces

## 5. Decisions
- Changed:
  - localized the highest-traffic visible UI chrome first
  - kept document logic, review logic, provider logic, and search delete behavior unchanged
  - suppressed wrong-language generated prose only in compact card UI, not in full detail content
- Deliberately not changed:
  - OCR/provider/backend logic
  - AI Labeler behavior
  - payment/AppSheet logic
  - Android work
  - generated formal German letter content
- Why:
  - task scope was UI chrome purity only

## 6. Validation
- `npx tsc --noEmit`: PASS
- Search validation:
  - repeated `rg` scans against the known mixed-language strings
  - remaining matches were manually classified
- Remaining intentional strings:
  - translation values inside `translations.ts`
  - tests / fixtures
  - domain content or generated German legal text
- Remaining risks:
  - lower-traffic risk/timeline surfaces still have some hardcoded German copy
  - not all 7-locale coverage was device-validated in this turn

## 7. Commit
- commit hash: pending
- commit message: `fix(i18n): enforce UI language purity across app chrome`

## 8. Follow-ups
- Convert remaining runtime German copy in:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartRiskPanel.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/labels.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/services/documentChainEngine.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/product/strategyCopy.ts`
- Device-check 7/7 locales on:
  - Home
  - Search
  - Detail overview/actions
  - OCR MVP result

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/speechUiStrings.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/documentTypeLabels.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentGuards.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/deriveNextStep.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/listCardSummary.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeTriage.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeUrgencyBanner.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeSelectionBar.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/components/SearchHeader.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/components/SearchHomeView.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/components/SearchFilterModal.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/profile/components/LanguageCards.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/settings/EinstellungenScreen.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartSummaryCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/DocumentSpeechSection.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/AnalyseHeaderCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/HeroCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/SimpleDocumentOverview.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/DetailsPanel.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/details-panel/FieldRow.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/details-panel/OcrConfidenceSection.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/DocumentAnalysisProgressCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/ozet-tab/KiZusammenfassung.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/useDetailMoreItems.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/detail-modals/MoreMenuSheet.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/modals/LoeschenModal.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/ocr-mvp/components/OcrMvpActionSummary.tsx`

Follow-up owner suggestion:
- Codex: remaining hardcoded runtime copy cleanup
- Claude: 7-locale device review and copy refinement
