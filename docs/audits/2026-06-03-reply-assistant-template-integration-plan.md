# Reply Assistant Template Integration Plan

Date: 2026-06-03
Mode: Audit/design only
Scope: template integration architecture for the existing 134-template inventory and the first approved body drafts

## 1. Existing reusable pieces

### A. Existing reply surfaces

- `src/features/detail/detail-modals/EinspruchSheet.tsx`
  - Already uses `AppSheet`.
  - Accepts plain generated text (`einspruchText`) plus copy/share actions.
  - Good minimal viewing surface for a generated draft preview.
  - Limitation: string-only; no structure for placeholders, safety note, metadata, or template provenance.

- `src/components/YanıtSablonlariModal.tsx`
  - Existing v1 “Antwort-Assistent” flow.
  - Already has:
    - mode selection
    - deterministic draft generation
    - editable draft text
    - clipboard/share/PDF export
    - disclaimer rendering
  - Strongest existing conceptual base for a future reply assistant.
  - Limitation: hard-coded for Finanzamt only and tied to custom analysis functions instead of generic template data.

- `src/utils/replySubject.ts`
  - Reusable subject generation helper.
  - Good candidate for a shared template-output layer:
    - builds concise subject lines
    - prioritizes `aktenzeichen`, `rechnungsnr`, `vertragsnr`, `frist`, `absender`
  - This should remain a utility, not be duplicated inside template files.

### B. Existing smart-trigger logic

- `src/services/smart-suggestions/documentSuggestions.ts`
  - Already identifies situations where “Einspruch” or a document response is relevant.
  - This is a good entry-point candidate for suggesting reply templates contextually.
  - Limitation: currently action-oriented and generic; does not map to specific template IDs.

### C. Existing domain dictionaries

- `src/data/kurumlar.ts`
  - Contains reusable institution metadata:
    - category
    - display name
    - alternate names
    - notes
    - typical document labels
  - Good source for:
    - institution normalization
    - recipient defaults
    - UI copy hints
  - Not a template source by itself.

### D. Existing state/types

- `src/store/types.ts`
  - Already contains `AktiveSablon` under settings:
    - `dokId`
    - `sablonId`
  - This proves the product already had a “template attached to document” concept.
  - Useful signal, but too narrow for the new system because it lacks:
    - template version
    - draft payload
    - placeholder values
    - approval state

### E. Existing modal/sheet pattern

- `src/design/components/AppSheet.tsx`
  - Canonical sheet primitive.
  - Supports title, subtitle, children, footer, close button, swipe-to-close.
  - Appropriate future host for:
    - template picker
    - template preview
    - placeholder completion form

### F. Existing i18n strategy

- `src/i18n/translations.ts`
  - Key-based string system with locale dicts and runtime fallback.
  - Template system should not store localized bodies inside this file.
  - Only UI chrome belongs in i18n:
    - picker labels
    - warnings
    - field labels
    - button text
    - safety note headings

## 2. Proposed folder structure

Recommended structure:

```text
src/features/reply-assistant/
  data/
    inventory/
      de-v1.inventory.ts
    templates/
      de/
        low-medium/
          bussgeld.ts
          jobcenter.ts
          finanzamt.ts
          miete.ts
          nebenkosten.ts
          krankenkasse.ts
          versicherung.ts
          utility.ts
          gemeinde.ts
    rules/
      legalSafety.de.ts
      placeholderRules.ts
  domain/
    types.ts
    renderTemplate.ts
    resolveTemplate.ts
    subject.ts
    recipient.ts
    placeholders.ts
  selectors/
    matchTemplateCandidates.ts
  docs/
    README.md
```

Design intent:

- `inventory/`
  - canonical metadata-only registry for all 134 templates
  - no long body text here

- `templates/de/...`
  - approved German bodies stored as structured data
  - split by domain for maintainability

- `rules/`
  - legal and placeholder policy isolated from bodies

- `domain/`
  - pure functions only
  - no UI coupling

- `selectors/`
  - future mapping from document context to candidate template IDs

## 3. Proposed `ReplyTemplate` TypeScript type

Recommended core type:

```ts
export type ReplyRiskLevel = 'low' | 'medium' | 'high';

export type ReplyActionType =
  | 'widerspruch'
  | 'einspruch'
  | 'fristverlaengerung'
  | 'nachreichung'
  | 'klarstellung'
  | 'belegeinsicht'
  | 'antrag'
  | 'korrektur'
  | 'meldung'
  | 'kuendigung'
  | 'ratenzahlung'
  | 'erinnerung';

export interface ReplyTemplateField {
  key: string;
  labelKey: string;
  required: boolean;
  source?:
    | 'document'
    | 'user'
    | 'derived'
    | 'institution';
  condition?: string;
  multiline?: boolean;
}

export interface ReplyTemplateSafety {
  riskLevel: ReplyRiskLevel;
  safetyNoteKey?: string;
  humanReviewRecommended?: boolean;
  forbiddenClaims?: string[];
}

export interface ReplyTemplate {
  id: string;
  locale: 'de';
  version: 1;
  category: string;
  institutionType: string;
  documentType: string;
  actionType: ReplyActionType;
  title: string;
  subjectLabel: string;
  body: string;
  fields: ReplyTemplateField[];
  safety: ReplyTemplateSafety;
  tags?: string[];
}
```

Important design choice:

- Store `title` and `subjectLabel` with the template because they are domain content, not just UI chrome.
- Store `labelKey` for field labels so the input UI remains localizable.

## 4. Placeholder / conditional syntax decision

### Recommended placeholder syntax

Use mustache-like placeholders:

```text
{{aktenzeichen}}
{{fristdatum}}
{{kundennummer}}
{{begruendung_kurz}}
```

Reasons:

- easy to read in plain text drafts
- easy to validate
- easy to render safely
- avoids coupling to JS expression parsing

### Recommended conditional syntax

Do not embed mini-logic in body strings.

Avoid:

```text
{{#if aktenzeichen}}Aktenzeichen: {{aktenzeichen}}{{/if}}
```

Instead, define conditional blocks as structured render segments in code later, or keep body templates simple and let renderer strip optional lines using placeholder policies.

Recommended rendering rule:

- If an optional placeholder appears on a dedicated line and has no value, remove the whole line.
- If a required placeholder is missing, the draft is not “ready”.

This is simpler and safer than introducing Handlebars-like templating.

### Final decision

- Placeholder syntax: `{{field_key}}`
- Conditional logic: renderer-side line omission only
- No embedded scripting

## 5. Safety rules placement

Safety rules should live in two layers.

### A. Global rule set

File:

- `src/features/reply-assistant/data/rules/legalSafety.de.ts`

Purpose:

- product-wide legal safety defaults
- reusable copy for warnings
- forbidden patterns

Examples:

- no guaranteed legal outcome
- no fabricated facts
- no pretending to be legal counsel
- no high-risk escalation text without dedicated review

### B. Per-template safety metadata

Inside each template:

- `riskLevel`
- `safetyNoteKey`
- `humanReviewRecommended`

Why both layers:

- global rules centralize policy
- per-template flags let UI render stronger warnings only when needed

## 6. How the first 10 approved templates would be stored

Recommended storage approach:

- Keep the 134 inventory separate from body drafts.
- Store first 10 approved bodies as domain-grouped exports.

Example:

```text
src/features/reply-assistant/data/inventory/de-v1.inventory.ts
src/features/reply-assistant/data/templates/de/low-medium/bussgeld.ts
src/features/reply-assistant/data/templates/de/low-medium/jobcenter.ts
src/features/reply-assistant/data/templates/de/low-medium/finanzamt.ts
...
```

Example shape:

```ts
export const deBussgeldTemplates: ReplyTemplate[] = [
  {
    id: 'bussgeld_deadline_extension_005',
    locale: 'de',
    version: 1,
    category: 'Bußgeld',
    institutionType: 'Bußgeldstelle',
    documentType: 'Fristsache',
    actionType: 'fristverlaengerung',
    title: 'Fristverlängerung Bußgeld',
    subjectLabel: 'Bitte um Fristverlängerung',
    body: '...',
    fields: [...],
    safety: {
      riskLevel: 'low',
      safetyNoteKey: 'reply.safety.low.general',
    },
  },
];
```

Reason:

- clean split between inventory and authored text
- simple future import/merge
- no giant 134-entry monolith

## 7. UI entry point recommendation

### Primary recommendation

Reuse the existing reply assistant direction, not `EinspruchSheet` directly.

Preferred entry point:

- evolve the concept behind `YanıtSablonlariModal.tsx`

Reason:

- it already models:
  - mode selection
  - preview/edit
  - copy/share/export
  - disclaimer
- that is much closer to a template assistant than the plain `EinspruchSheet`

### Role of `EinspruchSheet`

Keep `EinspruchSheet` as a temporary or narrow legacy preview surface, or refactor it later into a generic preview sheet.

It is too narrow to be the long-term main integration because it only accepts one raw string and two actions.

### Trigger recommendation

Future UI entry should come from one of:

1. Smart action recommendation in detail screen
2. “Antwort verfassen” / “Vorlage öffnen” action in detail actions
3. fallback explicit action in “More” menu

Best product path:

- smart suggestion proposes
- reply assistant opens
- user picks template candidate

## 8. AI personalization boundary

### What AI may do later

Allowed future role:

- rewrite tone lightly
- reorder paragraph phrasing
- personalize based on already-known document facts
- suggest missing non-legal context questions

### What AI must not do

- invent legal arguments
- infer facts not present in document/user input
- silently change legal meaning
- remove safety note
- upgrade low-risk template into a legal strategy draft

### Safe architecture boundary

Pipeline should be:

1. deterministic template selection
2. deterministic placeholder fill
3. safety checks
4. optional AI personalization as post-process
5. user review

So AI is a bounded enhancement layer, never the source of truth for base legal structure.

## 9. Test plan

### A. Data validation tests

- every inventory ID unique
- every body template ID exists in inventory
- every template field key unique within template
- every required placeholder appears in body
- no unsupported placeholder tokens remain after render

### B. Rendering tests

- required placeholders render correctly
- optional empty placeholders remove full line
- subject generation composes with `buildEmailSubject`
- safety note appears for flagged templates

### C. Mapping tests

- document context maps to expected candidate IDs
- Finanzamt/Jobcenter/Bußgeld examples produce correct shortlist

### D. Regression tests

- existing `replySubject` behavior preserved
- existing smart suggestions unaffected until integration is enabled
- no new dependency on runtime AI

### E. Manual QA later

- copy/share/export from preview
- missing required field blocks final draft
- i18n UI chrome remains localized

## 10. Minimal implementation phases

### Phase 1 — domain foundation

- add inventory registry file
- add `ReplyTemplate` type
- add placeholder renderer
- add global legal safety config

No UI changes yet.

### Phase 2 — first 10 template storage

- add first approved German templates as static data
- add validation tests

Still no production integration.

### Phase 3 — candidate resolver

- deterministic template matching from document context
- map institution/type/risk/action to candidate list

Still feature-flagged or isolated.

### Phase 4 — preview integration

- connect to reply assistant modal/sheet
- render body preview
- render safety note
- support copy/share/export

### Phase 5 — optional personalization hook

- only after deterministic path is stable
- explicit boundary and fallback

## Recommendation summary

The strongest safe path is:

- reuse `YanıtSablonlariModal` as the conceptual base
- keep `EinspruchSheet` as a narrow legacy preview or interim surface
- store 134 inventory separately from authored bodies
- use a simple `{{placeholder}}` syntax
- keep conditionals out of template text
- centralize legal safety rules
- keep AI as an optional post-render layer only

This gives a low-risk path from the current deterministic Finanzamt-only prototype to a scalable multi-template Reply Assistant.
