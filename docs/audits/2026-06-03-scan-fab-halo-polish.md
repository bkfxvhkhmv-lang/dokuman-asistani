## Metadata
- Date: 2026-06-03
- Scope: bottom scan FAB halo/glow only
- Commit: `7f01f1658` `style(nav): reduce scan FAB halo spread`

## Goal
- Keep the scan button prominent
- Narrow the blue aura
- Reduce opacity so the glow does not bleed into nearby labels or version text
- No layout or behavior change

## Files touched
- `/Users/bayramgul/bp_canavar_v6_refactor/src/navigation/mainTabsConfig.tsx`

## What changed
- Reduced outer halo diameter on iOS and Android
- Lowered halo opacity and shadow radius
- Tightened Android radial gradient spread
- Reduced pulse ring size and opacity
- Softened button shadow/elevation while preserving button size and tap target

## Not changed
- scan button position
- scan button size
- tap target
- onPress / scanner logic
- navigation
- labels / i18n
- version/footer layout
- global theme colors

## Validation
- `npx tsc --noEmit`: PASS
- `git status --short`: clean after commit

## Remaining step
- Device screenshot check on Home / Search / Settings bottom bar
