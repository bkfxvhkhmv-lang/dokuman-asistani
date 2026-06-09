# Typography And Divider Polish

## Report Metadata
- Author/Agent: Codex
- Role: premium polish / typography and divider surfaces
- Date: 2026-06-02
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: a7b1f86f8
- Task type: fix / validation
- Scope: central text tokens and clearly divider-like surfaces only
- Status: PASS

## 1. Scope
- Read [UI_DESIGN_GUARDRAILS.md](/Users/bayramgul/bp_canavar_v6_refactor/docs/design/UI_DESIGN_GUARDRAILS.md) first.
- Applied only a small premium polish pass to:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/theme.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/SimpleDocumentOverview.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/HeroCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/home-budget-bar/styles.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/design/components/AppBar.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/design/components/AppListRow.tsx`

## 2. Search commands used
- `sed -n '1,220p' /Users/bayramgul/bp_canavar_v6_refactor/docs/design/UI_DESIGN_GUARDRAILS.md`
- `sed -n '1,240p' /Users/bayramgul/bp_canavar_v6_refactor/src/theme.ts`
- `sed -n '1,260p' /Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/SimpleDocumentOverview.tsx`
- `sed -n '1,260p' /Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/HeroCard.tsx`
- `sed -n '1,260p' /Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/home-budget-bar/styles.ts`
- `sed -n '1,220p' /Users/bayramgul/bp_canavar_v6_refactor/src/design/components/AppBar.tsx`
- `sed -n '1,220p' /Users/bayramgul/bp_canavar_v6_refactor/src/design/components/AppListRow.tsx`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npx tsc --noEmit`
- `git -C /Users/bayramgul/bp_canavar_v6_refactor status --short`

## 3. Files touched
- [theme.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/theme.ts)
  - reason: softened primary/muted/subtle light theme text tokens
  - type: code
- [SimpleDocumentOverview.tsx](/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/SimpleDocumentOverview.tsx)
  - reason: changed obvious divider lines to hairline width
  - type: code
- [HeroCard.tsx](/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/HeroCard.tsx)
  - reason: changed section dividers to hairline width
  - type: code
- [styles.ts](/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/home-budget-bar/styles.ts)
  - reason: softened insight divider width
  - type: code
- [AppBar.tsx](/Users/bayramgul/bp_canavar_v6_refactor/src/design/components/AppBar.tsx)
  - reason: normalized app bar divider to hairline width
  - type: code
- [AppListRow.tsx](/Users/bayramgul/bp_canavar_v6_refactor/src/design/components/AppListRow.tsx)
  - reason: normalized row divider to hairline width
  - type: code
- [2026-06-02-codex-typography-divider-polish.md](/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-typography-divider-polish.md)
  - reason: permanent audit note
  - type: docs

## 4. Findings
- status: fixed
  - severity: should fix
  - user impact: pure-black text and heavier divider lines made surfaces feel sharper and less premium than the guardrail direction
  - technical root cause: central light theme tokens were slightly harsher and a few clear divider surfaces used thicker fixed widths
  - minimal solution: soften text tokens and convert obvious dividers to `StyleSheet.hairlineWidth`

## 5. Decisions
- Changed:
  - set light primary text to anthracite `#111827`
  - aligned muted/subtle light text to `#6B7280` and `#9CA3AF`
  - replaced clear divider `1` / `0.5` widths with `StyleSheet.hairlineWidth` in scoped surfaces
- Deliberately not changed:
  - no dark theme redesign
  - no glow/animation work
  - no radius redesign
  - no business logic
  - no user-facing copy

## 6. Validation
- `npx tsc --noEmit`: PASS
- no new hardcoded user-visible strings added
- `git status --short`: clean after commit

## 7. Commit
- commit hash: a7b1f86f8
- commit message: `style(ui): soften typography and divider surfaces`

## 8. Follow-ups
- Device-check dense list/detail surfaces to confirm the lighter divider treatment remains readable on real data.

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/theme.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/SimpleDocumentOverview.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/HeroCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/home-budget-bar/styles.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/design/components/AppBar.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/design/components/AppListRow.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-typography-divider-polish.md`

Follow-up owner suggestion:
- Codex: device verification if requested
