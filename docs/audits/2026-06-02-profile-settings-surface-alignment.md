# Audit: Profile Surface Alignment with Settings

**Date:** 2026-06-02
**Status:** FIXED

## Problem

`Profilbildschirm.tsx` used an older design language (dark blue header,
larger/looser spacing, bigger radius) that clashed with the Quiet Luxury
surface of `EinstellungenScreen.tsx`.

## Root Cause

Profile screen was not updated during the Settings refactor. It retained
`backgroundColor: C.primaryDark` for the header and custom spacing/radius
values that diverge from the Settings design primitives.

## Changes Applied (Profilbildschirm.tsx only)

| Token | Before | After |
|-------|--------|-------|
| Header background | `C.primaryDark` (blue) | `C.bg` + hairline bottom border |
| Avatar bg | `rgba(255,255,255,0.2)` | `C.primaryLight` |
| Avatar text | `#fff` | `C.primary` |
| Name text | `#fff` hardcoded | `C.text` |
| Sub text | `rgba(255,255,255,0.7)` | `C.textSecondary` |
| Close button | `rgba(255,255,255,0.15)` overlay | `C.bgCard` + `C.border` |
| Section borderRadius | 16 | 12 |
| Section borderWidth | 1 | hairlineWidth |
| Row paddingVertical | 15 | 12 |
| Row paddingHorizontal | 18 | 16 |
| Row gap | 14 | 12 |
| Icon box size | 34×34 | 29×29 |
| Icon box radius | 10 | 8 |
| Row label fontSize | 15 | 14 |
| Avatar size | 64×64 | 52×52 |

## What Was NOT Changed

- auth/logout logic (`showAbmelden`, `logout`)
- navigation path
- duplicate logout cleanup (separate backlog item)
- translations.ts
- EinstellungenScreen.tsx

## Validation

- `npx tsc --noEmit` → exit 0
- Profile screen renders without crash
- Logout action untouched

## Risk

LOW — style-only changes, single file, auth/logic untouched.
