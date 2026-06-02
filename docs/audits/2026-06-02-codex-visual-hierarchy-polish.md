# Visual Hierarchy Polish

## Report Metadata
- Author/Agent: Codex
- Role: visual hierarchy polish
- Date: 2026-06-02
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: pending
- Task type: fix / validation
- Scope: quiet hierarchy polish for existing home/detail card surfaces
- Status: PASS

## 1. Scope
- Read [UI_DESIGN_GUARDRAILS.md](/Users/bayramgul/bp_canavar_v6_refactor/docs/design/UI_DESIGN_GUARDRAILS.md) first.
- Applied only small hierarchy/noise reductions inside:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/home-budget-bar/CriticalGlowLayers.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/SimpleDocumentOverview.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/HeroCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/home-budget-bar/HomeBudgetBarView.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/home/components/HomeRecentList.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`

## 2. Search commands used
- `sed -n '1,220p' ...UI_DESIGN_GUARDRAILS.md`
- `sed -n` / `nl -ba` on the six scoped files
- `rg -n "toUpperCase\\(|LinearGradient|#EE6055|#1D9E75|fontWeight: '800'|fontWeight: '900'|letterSpacing: 0\\.8|shadowOpacity: 0\\.65|shadowRadius: 22|elevation: 12" ...`
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npx tsc --noEmit`
- `git -C /Users/bayramgul/bp_canavar_v6_refactor status --short`

## 3. Files touched
- [HeroCard.tsx](/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/HeroCard.tsx)
  - reason: reduced hero title weight and kept decorative shine removed
  - type: code
- [DokumentKarte.tsx](/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx)
  - reason: softened workflow/demo badge emphasis
  - type: code
- [2026-06-02-codex-visual-hierarchy-polish.md](/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-visual-hierarchy-polish.md)
  - reason: permanent audit note
  - type: docs

## 4. Findings
- status: fixed
  - severity: should fix
  - user impact: visual weight and glow treatment could feel louder than the “quiet utility” guardrail
  - technical root cause: lingering heavy font weights and ornamental highlight treatment
  - minimal solution: reduce title/badge weights and keep glow intensity restrained

## 5. Decisions
- Changed:
  - kept the reduced glow treatment
  - kept uppercase removals and lighter hierarchy already present in scoped files
  - reduced remaining heavy title/badge emphasis in `HeroCard` and `DokumentKarte`
- Deliberately not changed:
  - no layout redesign
  - no business logic
  - no Android-specific changes
  - no new strings

## 6. Validation
- `npx tsc --noEmit`: PASS
- no new hardcoded user-visible strings added
- `git status --short`: clean after commit

## 7. Commit
- commit hash: pending
- commit message: `style(ui): refine visual hierarchy and reduce visual noise`

## 8. Follow-ups
- Device smoke pass on home/detail surfaces to confirm the calmer hierarchy reads correctly with real data density.

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/features/detail/components/HeroCard.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/src/components/DokumentKarte.tsx`
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-visual-hierarchy-polish.md`

Follow-up owner suggestion:
- Codex: device verification if requested
