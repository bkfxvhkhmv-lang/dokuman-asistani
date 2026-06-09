# 2026-06-02 OCR Post-Save Action Hierarchy Audit

## Metadata
- scope: OCR MVP result screen post-save CTA hierarchy
- code changes: none
- validation: `npx tsc --noEmit` PASS

## Scope
- `src/features/ocr-mvp/OcrMvpScreen.tsx`
- `src/features/ocr-mvp/components/OcrMvpResultCard.tsx`

## Findings

### 1. Primary CTA swaps from Save to Open after save
- symptom:
  - before save: primary button is `In Dokumente speichern`
  - after save: primary button becomes `Dokument öffnen`
- component:
  - `OcrMvpResultCard`
- wiring:
  - `isSavedToDocuments ? ... onOpenDocument ... : onSaveToDocuments`
- data source:
  - `savedDocId` state in `OcrMvpScreen`
- assessment:
  - this is coherent and likely correct: save is a one-time action, then open becomes the next highest-value action
- risk:
  - low
- minimal fix:
  - none required

### 2. Secondary reset CTA remains visible after save
- symptom:
  - `Neue Analyse` remains visible after save/open state
- component:
  - `OcrMvpResultCard`
- wiring:
  - unconditional bottom reset button calling `onReset`
- data source:
  - always rendered regardless of `isSavedToDocuments`
- assessment:
  - this creates a deliberate fork: `Dokument öffnen` vs `Neue Analyse`
  - likely acceptable, but it makes the screen serve both archive continuation and repeated scanning
- risk:
  - medium: users may start a new scan immediately after save and skip validating the saved document
- minimal fix:
  - if product wants a stronger archive-first flow, demote `Neue Analyse` further visually or hide it until after opening the saved document

### 3. Result action summary remains visible both before and after save
- symptom:
  - export / preview actions remain available after save
- component:
  - `OcrMvpActionSummary` inside `OcrMvpResultCard`
- wiring:
  - rendered whenever `hasSummary`, independent of `isSavedToDocuments`
- assessment:
  - functional, but it competes with the archive transition goal after save
  - after save, the screen still behaves like a result workbench rather than a completed handoff
- risk:
  - medium
- minimal fix:
  - after save, consider collapsing secondary result actions under a smaller section or below `Dokument öffnen`

### 4. Saved state is local-session only
- symptom:
  - open CTA depends on local `savedDocId`
- component:
  - `OcrMvpScreen`
- wiring:
  - `savedDocId` is set only by `handleSaveToDocuments`
  - `handleOpenDocument` navigates with that id
- assessment:
  - correct for current flow
  - if save fails or duplicate detection maps to an existing document, CTA still resolves correctly because existing id is assigned
- risk:
  - low
- minimal fix:
  - none required

### 5. Save does not auto-open the saved document
- symptom:
  - after save, user stays on result screen and must explicitly tap `Dokument öffnen`
- component:
  - `OcrMvpScreen` / `OcrMvpResultCard`
- assessment:
  - this is a UX choice, not a bug
  - good if users often want export/share/preview after save
  - weaker if the product goal is “scan -> save -> continue in archive detail”
- risk:
  - medium, product-direction dependent
- minimal fix:
  - choose one clear policy:
    - either keep manual open and visually demote new scan/export clutter
    - or auto-open after save for a stronger completion flow

## Exact Files / Functions
- `src/features/ocr-mvp/OcrMvpScreen.tsx`
  - `handleSaveToDocuments`
  - `handleOpenDocument`
  - `handleReset`
  - render path passing `onSaveToDocuments`, `isSavedToDocuments`, `onOpenDocument`
- `src/features/ocr-mvp/components/OcrMvpResultCard.tsx`
  - saved/open/save CTA branch near `isSavedToDocuments`
  - unconditional `resetBtn`
  - `OcrMvpActionSummary` render path

## Decision
- current wiring is internally consistent
- the open question is product hierarchy, not broken state logic
- the strongest remaining UX ambiguity is:
  - after save, should the screen behave like a finished handoff to archive detail
  - or remain a flexible result workstation with preview/export/new scan still equally present?

## Recommendation
- status: audit only
- recommended next patch if desired:
  - keep `Dokument öffnen` as the single dominant post-save CTA
  - visually demote `Neue Analyse`
  - keep export/preview accessible but clearly secondary after save

