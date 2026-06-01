# Search Bulk Delete Audit

## Report Metadata
- Author/Agent: Codex
- Role: search result bulk selection/delete fix
- Date: 2026-06-02
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: 7a9c37f97
- Task type: fix
- Scope: Search/Ara document result management only
- Status: PASS

## 1. Scope
Codex added bulk selection and delete support to local Search/Ara document results in `/Users/bayramgul/bp_canavar_v6_refactor`. The fix is limited to the search result surface and does not change OCR/provider/backend logic, review logic, payment/AppSheet logic, or Android code.

Inspected folders/files:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/screens/Suchbildschirm.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/search/`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/hooks/useHomeState.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/AppBottomSheet.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`

Feature area:
- Search/Ara result list management
- selection mode
- delete confirmation
- store-driven result/count refresh

## 2. Search commands used
- `rg -n "Search|Suche|Ara|selected|selection|Auswählen|Seç|deleteSelected|deleteDocument|removeDocument|searchResults|filteredDocuments|visibleDocuments|DokumentKarte|FlatList|SectionList|HomeSelectionBar|handleBatchLoeschen|secilenModus|secilenIds" /Users/bayramgul/bp_canavar_v6_refactor/src`
- `sed -n '1,260p' /Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeSelectionBar.tsx`
- `sed -n '200,420p' /Users/bayramgul/bp_canavar_v6_refactor/src/features/home/hooks/useHomeState.ts`
- `sed -n '1,320p' /Users/bayramgul/bp_canavar_v6_refactor/src/screens/Suchbildschirm.tsx`
- `sed -n '1,240p' /Users/bayramgul/bp_canavar_v6_refactor/src/hooks/useSheet.ts`
- `sed -n '1,260p' /Users/bayramgul/bp_canavar_v6_refactor/src/components/AppBottomSheet.tsx`
- `rg -n "search\.advanced|const tr: Dict|const en: Dict|const fr: Dict|const es: Dict|const ru: Dict|const ar: Dict" /Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npx tsc --noEmit`
- `rg -n "Suchbildschirm|SearchHeader|SearchFilterModal|SearchHomeView|useSearchState" /Users/bayramgul/bp_canavar_v6_refactor/src/__tests__`

## 3. Files touched
- `/Users/bayramgul/bp_canavar_v6_refactor/src/screens/Suchbildschirm.tsx`
  - reason: add search selection mode, select-all-visible, clear selection, delete selected, confirmation sheet wiring
  - type of change: code
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
  - reason: add minimal selection/delete UI keys in all 7 languages
  - type of change: i18n
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-01-search-bulk-delete-audit.md`
  - reason: permanent fix report
  - type of change: docs

## 4. Findings
- status: fixed
- severity: should fix
- user impact: users previously had to open each document detail and delete one-by-one from Search/Ara
- technical root cause: `/Users/bayramgul/bp_canavar_v6_refactor/src/screens/Suchbildschirm.tsx` rendered `DokumentKarte` with `onLongPress={() => {}}` and `secilen={false}`, so no selection state existed on search results
- minimal solution: add local selection mode state and connect tap/long-press/selected-card rendering

- status: fixed
- severity: should fix
- user impact: there was no current-result-set bulk action path
- technical root cause: search results had no “select all visible” concept and no delete confirmation flow
- minimal solution: add a compact selection action panel above local results and reuse `useSheet()` + `AppBottomSheet` confirmation

- status: intentional
- severity: later
- user impact: semantic/V4 search results still do not support bulk selection
- technical root cause: V4 search uses `SemanticKarte` remote-style results, not direct local `DokumentKarte` management
- minimal solution: keep current patch limited to local document result management

- status: intentional
- severity: later
- user impact: result-count label text remains partly hardcoded in existing search surface
- technical root cause: broader i18n cleanup is explicitly out of scope for this task
- minimal solution: address in the later localization pass only

## 5. Decisions
- What was changed:
  - local search results now support selection mode
  - long press enters selection mode with the pressed document preselected
  - tap toggles selection while selection mode is active
  - selection panel exposes:
    - select all visible results
    - clear selection
    - delete selected
    - cancel selection
  - delete selected uses confirmation via `useSheet()` and `AppBottomSheet`
  - deleting selected dispatches `DELETE_DOKUMENT` for each selected id and relies on store-driven rerender to update search/home/review counts
- What was deliberately not changed:
  - V4 semantic result cards
  - review logic
  - display resolver logic
  - OCR/provider/backend
  - broader i18n cleanup
- Why:
  - task scope was local Search/Ara result management only

## 6. Validation
- `npx tsc --noEmit`: PASS (`EXIT:0`)
- Tests run:
  - none
  - no existing Search/Ara-specific test coverage was found under `/Users/bayramgul/bp_canavar_v6_refactor/src/__tests__`
- Manual checks:
  - code-path validation only
  - verified that `displayDocs` is the current filtered visible result set used by selection and delete
  - verified that deletion dispatches store updates, so search results and global counts refresh from shared store state
- Remaining risks:
  - V4 semantic results still have no selection mode
  - device-level interaction still needs a quick live check

## 7. Commit
- commit hash: `7a9c37f97`
- commit message: `fix(search): support bulk delete in document results`

## 8. Follow-ups
1. Device-check local search flow with 3 visible results:
   - long press one card
   - select all visible
   - delete selected
   - confirm results disappear immediately
2. Confirm Home counts and Hinweise count update after search deletion.
3. Decide later whether V4 semantic results also need bulk management.

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/screens/Suchbildschirm.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-01-search-bulk-delete-audit.md`

Follow-up owner suggestion:
- Codex: device validation and possible V4 semantic-result parity
