# Device-Visible Source Trace Audit

## Report Metadata
- Author/Agent: Codex
- Role: mobile code/data source trace audit
- Date: 2026-06-01
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: ef37f40dd
- Task type: audit
- Scope: trace exact rendering/data wiring for device-visible broken surfaces
- Status: FOLLOW-UP REQUIRED

## 1. Scope
Codex inspected the exact rendering and data-source wiring for device-visible issues reported from screenshots and device recordings. This audit is trace-only: no code changes, no translation changes, no normalizer implementation, no refactor.

Folders/files searched:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/store/`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/`

Feature areas:
- Home/dashboard hints and counts
- List/card title/type rendering
- Search/list/delete surfaces
- Detail labels and action surfaces
- AI labeler eligibility vs generic docs
- Stored-document display refresh/backfill wiring

## 2. Search Commands
- `git rev-parse --short HEAD && git branch --show-current && git status --short`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npx tsc --noEmit`
- `rg -n "offene Hinweise|Einige Angaben|Alle anzeigen|Angaben prüfen|Bitte Zahlen|Einige Zeichen|Zusammenfassung|Niedrig|Warum|Exportieren|Dokument löschen|Gönderen|Tarih|Genel Bakış|İşlemler|Belgeyi dinle|Kritik aksiyonları|Belge bilgilerini|Belgelerim|Yedek|Giriş Yap|Kural Mağazası|Gizlilik Politikası|useT\\(|useTranslation|locale|language|aiLanguage|speech" src`
- `rg -n "Autodoc|Pflanzhits|Drillisch|sim de|Unique Jewelry|Drv Bund|Gemeinschaftspraxis|Sonstiges|Dokument|listCardSummary|DokumentKarte|resolveDocumentTitle|humanizeTitle|getDetailTypeLabel|refineCanonicalTypFromText|canonicalDocTypes|docTypeConfig" src`
- `rg -n "offene Hinweise|Hinweise|Angaben prüfen|needsManualReview|reviewReasons|manualReview|reviewCount|risk|Besser erkennen|shouldLabel|isEligible|listCardSummary|HomeTriage|HomeDashboard" src`
- `rg -n "Search|Suche|Ara|Tümü|Alle|Offen|Açık|Son Belgeler|recentDocuments|visibleDocuments|filteredDocuments|searchResults|selected|selection|deleteSelected|deleteDocument|deleteAll|removeDocument|FlatList|SectionList|slice\\(|limit" src`
- `rg -n "aiDocumentType|aiDisplayTitle|customTitle|titel|typ|documentType|absender|sender|rohText|normalizer|normalize|humanizeTitle|displaySanitizer|migrate|backfill|reindex|accepted_snapshots|correction_events|learning" src`
- `sed -n` reads for exact files listed in findings below

## 3. Findings By Symptom

### Symptom 1: Turkish/German mixed UI

#### Finding 1.1
- Screenshot symptom: Turkish UI still shows German dashboard text like `offene Hinweise`, `Einige Angaben können ergänzt werden`, `Alle anzeigen`.
- Rendered text seen: `Offene Hinweise`, `Einige Angaben können ergänzt werden`, `Alle anzeigen →`.
- Component rendering it: `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeTriage.tsx`
- Function/helper used: inline JSX literals inside `HomeTriage` item cards and footer link.
- Data field source: derived counts from `docs` prop and `needsManualReview(d)`; text itself does not come from any field.
- Bypass: bypasses i18n entirely. `HomeTriage` does not call `useT()` for these strings.
- Minimal fix proposal: replace hardcoded German strings in `HomeTriage` with translation keys; keep count logic unchanged.

#### Finding 1.2
- Screenshot symptom: Turkish UI still shows German review labels like `Angaben prüfen`, `Prüfen`, `Bitte Zahlen prüfen.`, `Einige Zeichen konnten nicht erkannt werden.`
- Rendered text seen: `Angaben prüfen`, `Einige Angaben prüfen`, `Bitte Zahlen prüfen.`, `Einige Zeichen konnten nicht erkannt werden.`
- Component rendering it:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/details-panel/OcrConfidenceSection.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/AnalyseHeaderCard.tsx` and `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/ActionsPanel.tsx` via grep hit
- Function/helper used:
  - `buildUrgencyBadge()` in `DokumentKarte.tsx`
  - `reviewIssueMessage()` and `GRUND_TO_USER` in `OcrConfidenceSection.tsx`
  - `getReviewLabel()` in `documentGuards.ts`
- Data field source:
  - `dok.typ`, `dok.betrag`, `dok.frist`, `dok.confidence`, `ocrRisiken`
- Bypass: bypasses i18n entirely; review copy is hardcoded at helper/component level.
- Minimal fix proposal: move review labels/messages to translation keys and keep `getReviewIssues()` purely semantic.

#### Finding 1.3
- Screenshot symptom: Turkish UI still shows German section/actions like `Zusammenfassung`, `Warum?`, `Exportieren`, `Dokument löschen`.
- Rendered text seen: `Warum?`, `Exportieren`, `Dokument löschen`, `Dokumentdaten`.
- Component rendering it:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartRiskPanel.tsx`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/useDetailMoreItems.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/DetailsPanel.tsx`
- Function/helper used:
  - inline literals in `SmartRiskPanel`
  - `useDetailMoreItems()` row definitions
  - `DetailsPanel` section/action labels
- Data field source: not data-driven; static literals.
- Bypass: bypasses i18n entirely.
- Minimal fix proposal: route all static labels through `useT()`; keep action wiring unchanged.

#### Finding 1.4
- Screenshot symptom: German UI shows Turkish labels like `Gönderen`, `Tarih`, `Genel Bakış`, `İşlemler`, `Belgeyi dinle`, `Kritik aksiyonları dinle`, `Belgelerim`, `Yedek Dışa Aktar`, `Giriş Yap`, `Kural Mağazasını Aç`, `Gizlilik Politikası`.
- Rendered text seen: those Turkish strings exist in app dictionaries/speech UI.
- Component rendering it:
  - generic translated surfaces via `useT()` from `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
  - speech buttons via `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/DocumentSpeechSection.tsx`
- Function/helper used:
  - `useT()` / translation dictionary lookup
  - `speechUi(lang, key)` in `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/speechUiStrings.ts`
- Data field source:
  - current app language (`lang`) from `useLangPreference()` / app settings
- Bypass: this does not bypass i18n; it uses i18n correctly. Mixed language happens because some screens use translations while other screens stay hardcoded German.
- Minimal fix proposal: do not change these Turkish strings; instead eliminate German hardcoded bypasses so the chosen locale applies consistently.

### Symptom 2: Card/list type normalization not applied

#### Finding 2.1
- Screenshot symptom: cards still show generic type like `Sonstiges` for Autodoc, Unique Jewelry, Drv Bund, Gemeinschaftspraxis.
- Rendered text/type seen: `Sonstiges` on list cards.
- Component rendering it: `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`
- Function/helper used:
  - `quickIntent()` -> `getDocTypeConfig(dok.typ)`
  - card accessibility and visuals use raw `dok.typ`
- Data field source: stored `dok.typ`.
- Bypass: list cards do not call `getDetailTypeLabel()` and do not run `refineCanonicalTypFromText()` at display time. `getDocTypeConfig()` only uses `normalizeDocumentTyp()`, which maps legacy labels but does not inspect `rohText` for stronger upgrades.
- Minimal fix proposal: route card/list type label through a display-time refinement helper that can use `rohText` for weak stored types.

#### Finding 2.2
- Screenshot symptom: detail screens can show better type than cards, creating inconsistency.
- Rendered text/type seen: weak list type vs upgraded detail label.
- Component rendering it:
  - cards: `DokumentKarte.tsx`
  - detail: `/Users/bayramgul/bp_canavar_v6_refactor/src/constants/docTypeConfig.ts` via `getDetailTypeLabel()` on detail surfaces
- Function/helper used:
  - card path: `getDocTypeConfig(dok.typ)`
  - detail path: `getDetailTypeLabel(dok.aiDocumentType ?? dok.typ, dok.rohText, dok.titel)`
- Data field source: same `dok.typ`, `dok.aiDocumentType`, `dok.rohText`, `dok.titel`
- Bypass: list path bypasses display-time weak-type upgrade logic that detail path already has.
- Minimal fix proposal: share one display resolver between list/detail instead of separate raw/canonical paths.

#### Finding 2.3
- Screenshot symptom: `sim.de` boilerplate title and `Pflanzhits` address title still visible in some surfaces.
- Rendered text/type seen: long OCR/legal/address tails in title.
- Component rendering it: list cards via `DokumentKarte.tsx`; likely other list-like surfaces using `resolveDocumentTitle()`.
- Function/helper used: `resolveDocumentTitle(dok)` in `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/displaySanitizer.ts`
- Data field source priority: `customTitle > aiDisplayTitle > titel`
- Bypass:
  - If old documents already have `customTitle` or `aiDisplayTitle`, sanitizer deliberately bypasses OCR cleanup and returns them as-is.
  - If a surface renders `dok.titel` directly instead of `resolveDocumentTitle()`, it bypasses sanitizer completely.
- Minimal fix proposal: audit every surface for direct `dok.titel` usage and decide whether old accepted AI/custom titles need a one-time backfill or re-sanitization rule.

#### Finding 2.4
- Screenshot symptom: generic `Dokument`/`Sonstiges` persists on older docs despite new normalization logic.
- Component rendering it: card/list surfaces through `DokumentKarte.tsx`, foldering through `useHomeState`, search grouping through search chips.
- Function/helper used:
  - `normalizeDocumentTyp()` in `canonicalDocTypes.ts`
  - `refineCanonicalTypFromText()` exists but only where explicitly called
- Data field source: stored `dok.typ`
- Bypass: `normalizeDocumentTyp()` does not strengthen weak types from `rohText`; `refineCanonicalTypFromText()` is not wired into card/list rendering or persistence backfill.
- Minimal fix proposal: use one display-time type resolver for weak values and keep persistence/backfill as a separate decision.

### Symptom 3: Review/Hinweise count still too high

#### Finding 3.1
- Screenshot symptom: Home shows `38/7 offene Hinweise` and generic docs show `Angaben prüfen`.
- Rendered text seen: `Offene Hinweise`, `Einige Angaben können ergänzt werden`, review counts.
- Component rendering it: `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeTriage.tsx`
- Function/helper used: count loop inside `HomeTriage`; upstream `reviewDocs` selector in `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/index.tsx`
- Data field source:
  - `data.aufgaben` from `useHomeData`/`useHomeState`
  - each doc passed through `needsManualReview(d)`
- Bypass: count does not distinguish severity/source of review reason; any `needsManualReview` increments the same visible bucket.
- Minimal fix proposal: expose reason breakdown from `getManualReviewReasons()` and count only selected review classes on Home.

#### Finding 3.2
- Screenshot symptom: generic docs still show `Angaben prüfen` badge in cards.
- Rendered text seen: `Angaben prüfen`
- Component rendering it: `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`
- Function/helper used: `buildUrgencyBadge(dok, tage, cardInsight, Colors)`
- Data field source: `needsManualReview(dok)` and absence of `cardInsight`
- Bypass: badge uses broad `needsManualReview(dok)` without checking why the doc is in review or whether the issue is user-actionable.
- Minimal fix proposal: gate the badge by selected manual review reasons instead of any review reason.

#### Finding 3.3
- Screenshot symptom: strong senders like Autodoc still show `Besser erkennen` or generic review feel.
- Component rendering it:
  - `Besser erkennen` via `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/details-panel/BesserErkennenCard.tsx`
  - eligibility from `/Users/bayramgul/bp_canavar_v6_refactor/src/services/AiLabelerService.ts`
- Function/helper used: `shouldLabel(dok)` in `AiLabelerService.ts`
- Data field source: `dok.typ`, `dok.absender`, `dok.titel`, `dok.rohText`, `dok.aiLabelledAt`
- Bypass: `shouldLabel()` evaluates raw stored `typ`, `absender`, `titel`; it does not look at display-time upgraded type/title or sender normalization result. A document can therefore be visually strong after display-time cleanup but still AI-eligible because the stored fields remain weak.
- Minimal fix proposal: align `shouldLabel()` with the same display resolvers or explicitly base it on normalized strength checks.

#### Finding 3.4
- Screenshot symptom: OCR warning hints can still inflate review feel.
- Component rendering it: `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/details-panel/OcrConfidenceSection.tsx`
- Function/helper used:
  - `getReviewIssues(dok)`
  - OCR risk mapping via `GRUND_TO_USER`
- Data field source: `dok.typ`, `dok.betrag`, `dok.frist`, `dok.absender`, `ocrRisiken`, `dok.confidence`
- Bypass: warning copy is deduplicated, but not localized; also confidence/risk issues are merged into one generic hint block, which visually amplifies “many things are wrong”.
- Minimal fix proposal: keep semantic review reasons separate from OCR uncertainty copy and show fewer generic caution messages.

### Symptom 4: Search/Ara delete/manage issue

#### Finding 4.1
- Screenshot symptom: user sees document count in search/list but must delete one by one.
- Rendered text seen: search results list and counts; no bulk delete/select surface.
- Component rendering it: `/Users/bayramgul/bp_canavar_v6_refactor/src/screens/Suchbildschirm.tsx`
- Function/helper used:
  - `FlatList` with `DokumentKarte`
  - `renderLokal()` passes `onLongPress={() => {}}` and `secilen={false}`
- Data field source: `displayDocs` from `useSearchState()` / `useSmartSearch()`
- Bypass: search list bypasses Home selection model entirely. There is no selection state, no bulk action bar, and long press is a no-op.
- Minimal fix proposal: either add shared selection hooks to search results or route users to the documents tab for bulk actions.

#### Finding 4.2
- Screenshot symptom: Home/document list can show many docs but only first subset is visible until user drills deeper.
- Component rendering it: `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeRecentList.tsx`
- Function/helper used:
  - `const docs = deduped.slice(0, useStacking ? 20 : 6)`
  - footer link `Alle {deduped.length} Dokumente anzeigen`
- Data field source: `data.alleDocs`, `data.aufgaben`, `data.ordnerDocs`, `data.zahlungsDocs`
- Bypass: Home deliberately limits visible cards, so count and visible list are different by design.
- Minimal fix proposal: keep the limit, but make the bulk-manage entry point clearer from the “show all” flow.

#### Finding 4.3
- Screenshot symptom: bulk delete exists in one surface but not where the user was searching.
- Component rendering it:
  - selection/delete support in `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/hooks/useHomeState.ts`
  - `HomeSelectionBar` on Home/Documents surface
- Function/helper used:
  - `handleLongPress`, `handleSecim`, `handleBatchLoeschen()`
- Data field source: `secilenIds` set in `useHomeState`
- Bypass: Search screen does not consume `useHomeState` selection actions.
- Minimal fix proposal: either share selection state across Home/Search or add explicit “manage all” navigation from search results.

### Symptom 5: Existing docs not updating with new rules

#### Finding 5.1
- Screenshot symptom: old docs still show old labels/titles after normalizer improvements.
- Component rendering it: all card/detail surfaces that read stored docs.
- Function/helper used:
  - storage reducer `/Users/bayramgul/bp_canavar_v6_refactor/src/store/reducers/documents.ts`
  - persistence loader `/Users/bayramgul/bp_canavar_v6_refactor/src/store/persistence.ts`
- Data field source: stored `dok.typ`, `dok.titel`, `dok.absender`, plus `customTitle`, `aiDisplayTitle`, `aiDocumentType`, `aiSender`
- Bypass: there is no migration/backfill/reindex for title/type/sender improvements. `persistence.ts` only migrates file paths, not semantic display fields.
- Minimal fix proposal: decide explicitly between display-time recomputation for all legacy docs or a one-time semantic backfill.

#### Finding 5.2
- Screenshot symptom: some docs improve only in certain surfaces, not everywhere.
- Function/helper used:
  - `resolveDocumentTitle()` and `resolveDocumentSender()` in `displaySanitizer.ts`
  - `getDetailTypeLabel()` in `docTypeConfig.ts`
- Data field source priority:
  - title: `customTitle > aiDisplayTitle > titel`
  - sender: `aiSender > normalized absender/rohText recovery`
  - type detail label: `aiDocumentType ?? typ` with weak-type display upgrade if `rohText` exists
- Bypass:
  - list cards use title/sender sanitizer, but type still comes from raw `dok.typ`
  - old stored strong-looking but wrong `customTitle`/`aiDisplayTitle` values bypass OCR sanitizer by design
- Minimal fix proposal: centralize all display-time identity resolution into one shared resolver used by cards, detail, search, and export summaries.

#### Finding 5.3
- Screenshot symptom: accepted AI labels do not force a full app-wide reclassification pass.
- Function/helper used:
  - AI fields referenced in `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/displaySanitizer.ts`
  - AI label eligibility in `/Users/bayramgul/bp_canavar_v6_refactor/src/services/AiLabelerService.ts`
- Data field source: `aiDisplayTitle`, `aiDocumentType`, `aiSender`, `aiLabelledAt`
- Bypass: accepted AI label values affect only surfaces that actually consult those AI fields. Surfaces still using raw `dok.typ` or raw summary rules remain unchanged.
- Minimal fix proposal: audit all visible surfaces for raw `dok.typ`/`dok.titel` access and switch them to shared resolvers before considering any re-labeling logic.

## 4. Exact Files / Functions Involved

### i18n bypasses
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeTriage.tsx`
  - hardcoded dashboard hint strings
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentGuards.ts`
  - `getReviewLabel()` returns German strings
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`
  - `buildUrgencyBadge()` returns `Angaben prüfen`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/details-panel/OcrConfidenceSection.tsx`
  - `GRUND_TO_USER`, `reviewIssueMessage()`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/SmartRiskPanel.tsx`
  - `Warum?`, `Weniger`, `Alle Risikofaktoren`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/smart-risk-engine/labels.ts`
  - risk level labels
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/hooks/useDetailMoreItems.ts`
  - Exportieren/Delete/etc.
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/DetailsPanel.tsx`
  - section titles and destructive CTA text

### display normalizer paths
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/displaySanitizer.ts`
  - `resolveDocumentTitle()`
  - `resolveDocumentSender()`
  - `safeDisplayTitel()`
  - `sanitizeOcrTitle()`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/constants/docTypeConfig.ts`
  - `getDocTypeConfig()`
  - `getDetailTypeLabel()`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/product/canonicalDocTypes.ts`
  - `normalizeDocumentTyp()`
  - `refineCanonicalTypFromText()`
  - `normalizeAndRefineTyp()`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`
  - consumes title/sender resolver but not refined type resolver

### review guard paths
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentGuards.ts`
  - `getReviewIssues()`
  - `getManualReviewReasons()`
  - `needsManualReview()`
  - `isPaymentLikeDocument()`
  - `isDeadlineSensitiveDocument()`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/index.tsx`
  - `reviewDocs` selector from `data.aufgaben`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeTriage.tsx`
  - visible count rendering
- `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/listCardSummary.ts`
  - `buildCardInsight()`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`
  - `buildUrgencyBadge()`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/services/AiLabelerService.ts`
  - `shouldLabel()`

### selector/delete paths
- `/Users/bayramgul/bp_canavar_v6_refactor/src/screens/Suchbildschirm.tsx`
  - `renderLokal()` long press disabled
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/useSearchState.ts`
  - builds filtered search result set only; no selection state
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/hooks/useHomeState.ts`
  - owns `secilenIds`, `handleBatchLoeschen()`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeRecentList.tsx`
  - slices visible docs and links to search

### persistence/backfill paths
- `/Users/bayramgul/bp_canavar_v6_refactor/src/store/reducers/documents.ts`
  - stores and updates documents as-is
- `/Users/bayramgul/bp_canavar_v6_refactor/src/store/persistence.ts`
  - only file-path migration; no semantic migration/backfill

## 5. Bypass Map

### i18n bypasses
- `HomeTriage.tsx` bypasses `useT()` with hardcoded German dashboard strings.
- `documentGuards.ts` returns German labels directly from domain helpers.
- `DokumentKarte.tsx` hardcodes review badge copy.
- `OcrConfidenceSection.tsx` hardcodes all OCR/review warning copy.
- `SmartRiskPanel.tsx`, `useDetailMoreItems.ts`, `DetailsPanel.tsx` hardcode visible German UI labels.
- Mixed Turkish/German therefore comes from partial i18n adoption, not bad locale selection.

### display normalizer bypasses
- Card/list type rendering uses raw `dok.typ` -> `normalizeDocumentTyp()` only; it skips `getDetailTypeLabel()` and weak-type text refinement.
- Any surface using `dok.titel` directly bypasses `resolveDocumentTitle()`.
- `customTitle` and `aiDisplayTitle` intentionally bypass OCR title sanitization, so bad accepted/stored values remain visible.
- `shouldLabel()` evaluates raw stored fields, not display-normalized identity strength.

### review guard bypasses
- Home hint count buckets all `needsManualReview()` cases together.
- Card `Angaben prüfen` badge uses broad `needsManualReview()` without reason filtering.
- `Besser erkennen` eligibility uses raw weak-field checks and can ignore that the display layer already looks strong.

### selector/delete bypasses
- Search results render `DokumentKarte` with no selection model and no long-press action.
- Bulk delete exists only in Home `useHomeState()` / `HomeSelectionBar`.
- Home list slicing (`slice(0, 6)` or `slice(0, 20)`) makes counts larger than visible subsets by design.

## 6. Minimal Fix Plan

### Phase 1: must fix first
1. Replace the top-level visible hardcoded German strings in `HomeTriage.tsx`, `documentGuards.ts`, `DokumentKarte.tsx`, `OcrConfidenceSection.tsx`, `useDetailMoreItems.ts`, `DetailsPanel.tsx`, `SmartRiskPanel.tsx`, and risk labels.
2. Unify list/detail type display so weak `dok.typ` values do not stay `Sonstiges` on cards while detail already knows better.
3. Decide whether Search should support bulk selection/delete or explicitly route users to the Home/Documents surface for that action.

### Phase 2: should fix
1. Align `shouldLabel()` with display-time normalized strength checks so `Besser erkennen` does not remain visible only because stored raw fields are weak.
2. Use reason-aware review selectors instead of generic `needsManualReview()` for Home counts and card badges.
3. Audit all remaining raw `dok.titel` and raw `dok.typ` UI usages and switch them to shared resolvers.

### Phase 3: later
1. Decide on a legacy semantic backfill strategy for old docs with stale `customTitle`, `aiDisplayTitle`, `aiDocumentType`, or `typ`.
2. Add optional reason breakdown telemetry/debugging for review counts so future visible count spikes can be traced quickly.
3. Revisit whether accepted AI labels should be re-sanitized or frozen as authoritative user-confirmed display text.

## 7. Validation
- `npx tsc --noEmit`: PASS (`EXIT:0`)
- Device tests: not run by design
- Code changes: none
- Remaining risk: this audit traces exact likely sources, but some screenshot-only symptoms can still involve another surface rendering the same string through a duplicate component.

## 8. Follow-up Updates
- 2026-06-02 — Phase 1A resolver wiring applied in commit `70f663f9b`
  - Shared compact-surface type resolver added in `/Users/bayramgul/bp_canavar_v6_refactor/src/constants/docTypeConfig.ts`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx` now uses display-time resolved type for:
    - card intent/icon tone
    - urgency/review badge gating
    - compact card insight summary
    - accessibility label type identity
  - Result: Home/Search/Dokumente cards now benefit from the same weak-type refinement chain as Detail without mutating stored documents.
- 2026-06-02 — Phase 1B review noise reduction applied in commit `772301de0`
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/utils/documentGuards.ts` now separates low-confidence from actionable review reasons.
  - Generic/weak type alone no longer creates `needsManualReview()`.
  - Payment/deadline review checks now use an effective review type that can refine weak OCR types from text evidence without downgrading strong raw types like `Bußgeld` or `Kündigung`.
  - Important sender-missing authority/court/official docs now stay actionable via `missing_sender_for_important_doc`.
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/AnalyseHeaderCard.tsx` no longer falls back to generic `Angaben prüfen` purely from mid confidence when there is no actionable review reason.

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-01-codex-device-visible-source-trace.md`

Follow-up owner suggestion:
- Codex: source-level wiring cleanup for card/review/search surfaces
- Claude: broad architecture/i18n prioritization across the same findings
