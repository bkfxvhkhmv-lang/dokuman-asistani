# 2026-06-02 Detail Long Field Wrap Polish

## Scope
- `src/features/detail/components/details-panel/FieldRow.tsx`
- `src/features/detail/detail-modals/PaymentPrepareSheet.tsx`
- `src/features/detail/detail-modals/styles.ts`

## Problem
- Long IBAN and other long field values could overflow or become hard to read inside detail/payment surfaces.
- Some small related button surfaces felt slightly out of rhythm with the nearby 16px card radius system.

## Change
- Enabled safe wrapping/shrinking for long field values in detail rows.
- Kept values selectable.
- Grouped IBAN visually in the payment prep sheet for easier reading and wrapping.
- Softened related small button radius to match nearby surfaces.

## Validation
- `npx tsc --noEmit`: PASS
- long field/value surfaces now wrap instead of forcing overflow

## Commit
- `fix(ui): improve long field wrapping and button surface rhythm`
