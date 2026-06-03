# Reply Assistant Phase 1 Plan

Date: 2026-06-03
Mode: Plan only
Scope: minimal infrastructure for Reply Assistant without UI, AI, production entry point, or full template import

## 1. Proposed file structure

Phase 1 should introduce only the minimum deterministic foundation.

```text
src/features/reply-assistant/
  domain/
    types.ts
    render/
      renderReplyTemplate.ts
      parseConditionalBlocks.ts
      validateTemplatePayload.ts
    fixtures/
      sampleTemplates.ts
  data/
    rules/
      legalSafety.de.ts
  __tests__/
    renderReplyTemplate.test.ts
    parseConditionalBlocks.test.ts
    validateTemplatePayload.test.ts
```

Notes:

- `domain/types.ts`
  - all Phase 1 type definitions
- `render/`
  - pure deterministic parsing/rendering logic
- `fixtures/`
  - 1–2 sample templates only for validation and tests
  - no bulk approved template import yet
- `data/rules/`
  - global legal safety policy
- `__tests__/`
  - rendering and validation tests only

Non-goal for Phase 1:

- no `inventory/` import yet
- no production template registry yet
- no UI components

## 2. Type definitions

### Core template types

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
  multiline?: boolean;
  source?: 'document' | 'user' | 'derived' | 'institution';
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

### Render payload types

```ts
export type ReplyTemplateValues = Record<string, string | null | undefined>;

export interface RenderReplyTemplateInput {
  template: ReplyTemplate;
  values: ReplyTemplateValues;
}

export interface RenderReplyTemplateResult {
  ok: boolean;
  text: string | null;
  missingRequiredFields: string[];
  unknownPlaceholders: string[];
  blockedReason?: 'missing_required' | 'unknown_placeholder' | 'invalid_template';
}
```

### Conditional block model

Phase 1 should support a restricted internal model for conditional blocks.

```ts
export interface ConditionalBlock {
  field: string;
  body: string;
}
```

Important:

- Draft bodies may continue to contain markers like `{{#if field}} ... {{/if}}`
- But production must not run a generic Mustache/Handlebars engine
- These markers are only input syntax for our own safe parser

## 3. Renderer behavior

### A. Placeholder syntax

Allowed placeholder syntax:

```text
{{field_key}}
```

Allowed field key pattern:

```text
[a-z0-9_]+
```

No dotted access, no expressions, no helpers, no function calls.

Forbidden:

```text
{{user.name}}
{{someFunction()}}
{{{unsafe_html}}}
```

### B. Conditional block syntax

Allowed draft syntax:

```text
{{#if aktenzeichen}}
Aktenzeichen: {{aktenzeichen}}
{{/if}}
```

But runtime behavior must be:

- parsed only by our own restricted parser
- only `#if <field>` blocks are allowed
- no nested blocks in Phase 1
- no `else`
- no loops
- no helpers
- no evaluation

If parser sees unsupported syntax:

- render must fail safe
- template is blocked

### C. Required field behavior

If a required field is missing or empty:

- render result is blocked
- `ok = false`
- `text = null`
- field is listed in `missingRequiredFields`

This prevents incomplete drafts from being treated as final.

### D. Optional field behavior

If an optional field is empty:

- its conditional block is removed entirely
- or, if placeholder appears on a standalone optional line without a block, that line is removed by cleanup rules

Goal:

- no ugly dangling labels like `Aktenzeichen:`
- no broken blank sentences

### E. Unknown placeholder behavior

If the body contains a placeholder not declared in `template.fields`:

- render is blocked
- `unknownPlaceholders` returns the offending keys
- no partial “best effort” rendering

This is a hard fail-safe.

### F. Output boundary

Rendered output is only a draft string.

It does not:

- send email
- share automatically
- export automatically
- enter production actions directly

It must later go to a user-edit screen first.

## 4. Validation cases

Phase 1 should include deterministic validation before runtime usage.

### Template structure validation

Validate:

- `id` exists and is non-empty
- `locale === 'de'`
- `version === 1`
- `body` non-empty
- `fields` keys unique
- `required` field definitions valid
- `safety.riskLevel` valid

### Placeholder validation

Validate:

- every `{{field}}` token matches allowed syntax
- every placeholder is declared in `fields`
- every required field is actually used in body, unless explicitly documented otherwise

### Conditional validation

Validate:

- only `{{#if field}}` and `{{/if}}`
- no nesting
- no unmatched open/close tags
- conditional field must exist in `fields`

### Safety metadata validation

Validate:

- high-risk templates can be flagged `humanReviewRecommended`
- `safetyNoteKey` shape is valid if present

## 5. Test cases

### A. Happy path tests

1. Renders simple template with all required fields
2. Renders template with optional field present
3. Removes conditional block when optional field missing

### B. Required field failure tests

4. Blocks render when required field missing
5. Blocks render when required field empty string

### C. Unknown placeholder tests

6. Blocks render when body contains undeclared placeholder
7. Blocks render when conditional block references undeclared field

### D. Conditional parser tests

8. Accepts one simple `#if` block
9. Rejects nested `#if`
10. Rejects `else`
11. Rejects malformed closing tag

### E. Safety tests

12. Preserves template safety metadata in render result context if needed
13. Confirms no HTML or code execution path exists

### F. Cleanup tests

14. Removes empty optional lines cleanly
15. Preserves paragraph spacing after block removal

## 6. How approved templates later enter registry

Phase 1 should not import the real approved templates yet.

Later path:

1. Approved body drafts are normalized into `ReplyTemplate` objects
2. They are grouped by domain
3. They are added to a static registry module
4. Registry runs through validation tests
5. Only validated templates become available to future UI integration

Recommended future shape:

```ts
export const replyTemplateRegistry: ReplyTemplate[] = [
  ...deBussgeldTemplates,
  ...deJobcenterTemplates,
  ...deFinanzamtTemplates,
];
```

But that registry is Phase 2+, not Phase 1.

## 7. How AI later fits as bounded post-process

AI is explicitly out of scope for Phase 1, but the boundary should be fixed now.

Future safe pipeline:

1. static template chosen
2. required fields validated
3. deterministic render completed
4. safety metadata attached
5. optional AI post-process may rewrite style only
6. user reviews and edits manually

Allowed AI role later:

- smoother phrasing
- lighter tone adaptation
- minor reformatting

Forbidden AI role later:

- invent facts
- add new legal claims
- delete safety messaging
- change legal meaning silently

This keeps the deterministic renderer as the source of truth.

## 8. Non-goals

Phase 1 does not include:

- UI sheet/modal integration
- smart action wiring
- production entry points
- document-to-template matching
- template picker
- AI personalization
- PDF export
- copy/share flows
- import of all approved templates
- live use in `EinspruchSheet` or `YanıtSablonlariModal`

## Recommendation summary

Phase 1 should produce only the safe deterministic engine foundation:

- types
- safety rule data
- restricted placeholder renderer
- restricted conditional parser
- strict validation
- tests
- 1–2 sample fixtures

The most important design constraint is:

- draft syntax may look Mustache-like
- runtime must not behave like a generic template engine

That means:

- no `eval`
- no remote execution
- no helpers
- no arbitrary expressions
- no unknown placeholders
- fail-safe blocking for invalid drafts

This keeps the system narrow, reviewable, and safe before any real template rollout.
