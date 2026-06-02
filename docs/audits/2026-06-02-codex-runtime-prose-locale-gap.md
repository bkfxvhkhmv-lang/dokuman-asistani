# Runtime Prose Locale Gap

## Report Metadata
- Author/Agent: Codex
- Role: runtime prose locale coverage fix
- Date: 2026-06-02
- Repository: bp_canavar_v6_refactor
- Branch: feature/ocr-api-integration
- Commit: pending
- Task type: fix / validation / docs
- Scope: FR/ES/RU/AR translation coverage for runtime prose keys
- Status: PASS

## 1. Scope
- Inspected only:
  - `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- Filled missing locale coverage for runtime prose keys in:
  - `fr`
  - `es`
  - `ru`
  - `ar`
- Feature area:
  - runtime risk/detail/enhancement prose translation completeness

## 2. Search commands used
- `cd /Users/bayramgul/bp_canavar_v6_refactor && npx tsc --noEmit`
- locale block counts:
```bash
python3 - <<'PY'
from pathlib import Path
text=Path('src/i18n/translations.ts').read_text()
locales=['fr','es','ru','ar']
for i,loc in enumerate(locales):
    start=text.index(f"const {loc}: Dict = {{")
    if i+1 < len(locales):
        end=text.index(f"const {locales[i+1]}: Dict = {{")
    else:
        end=text.index('const DICTS:')
    block=text[start:end]
    groups=['risk.explain.','risk.factor.','risk.reduce.','risk_panel.','detail.next.','scan.enhance.','risk.peer.']
    for g in groups:
        print(f'[{block.count(\"\\'\"+g)}] {loc.upper()}: {g}')
PY
```

## 3. Files touched
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
  - reason: added FR/ES/RU/AR runtime prose keys
  - type of change: i18n
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-runtime-prose-locale-gap.md`
  - reason: permanent report
  - type of change: docs

## 4. Findings
- status: fixed
  - severity: blocker
  - user impact: runtime prose localization architecture was complete, but 4 locales still fell back for new low-traffic prose surfaces
  - technical root cause: new runtime key sets had only been added to `de`, `tr`, and `en`
  - minimal solution: add matching `fr`, `es`, `ru`, `ar` keys without changing consumer code

- status: intentional
  - severity: later
  - user impact: none in this commit
  - technical root cause: residual non-runtime or out-of-scope strings remain elsewhere
  - minimal solution: separate cleanup pass for unrelated surfaces

## 5. Decisions
- What was changed:
  - added FR/ES/RU/AR coverage for:
    - `risk.explain.*`
    - `risk.factor.*`
    - `risk.reduce.*`
    - `risk_panel.*`
    - `detail.next.*`
    - `scan.enhance.*`
    - `risk.peer.*`
- What was deliberately not changed:
  - any consumer component
  - any smart-risk engine file
  - any detail/enhancement renderer
  - out-of-scope residual surfaces
- Why:
  - this commit was locale-gap only

## 6. Validation
- `npx tsc --noEmit`: PASS
- Coverage counts:
  - `FR`: `risk.explain=14`, `risk.factor=27`, `risk.reduce=9`, `risk_panel=11`, `detail.next=23`, `scan.enhance=17`, `risk.peer=2`
  - `ES`: `risk.explain=14`, `risk.factor=27`, `risk.reduce=9`, `risk_panel=11`, `detail.next=23`, `scan.enhance=17`, `risk.peer=2`
  - `RU`: `risk.explain=14`, `risk.factor=27`, `risk.reduce=9`, `risk_panel=11`, `detail.next=23`, `scan.enhance=17`, `risk.peer=2`
  - `AR`: `risk.explain=14`, `risk.factor=27`, `risk.reduce=9`, `risk_panel=11`, `detail.next=23`, `scan.enhance=17`, `risk.peer=2`
- Remaining risks:
  - wording quality in low-traffic locales may still deserve native copy review later

## 7. Commit
- commit hash: pending
- commit message: `fix(i18n): add FR/ES/RU/AR translations for runtime prose keys`

## 8. Follow-ups
- residual sweep for unrelated out-of-scope strings:
  - `ActionSimulatorModal`
  - `documentActionFlows`
  - `documentAnalysis`
  - `camera overlay`
  - `payment/share/display strings`
  - `riskAnalysis`
  - `useSheet`
  - `displaySanitizer`

## Ownership
This report was prepared by: Codex

Responsible changed files:
- `/Users/bayramgul/bp_canavar_v6_refactor/src/i18n/translations.ts`
- `/Users/bayramgul/bp_canavar_v6_refactor/docs/audits/2026-06-02-codex-runtime-prose-locale-gap.md`
