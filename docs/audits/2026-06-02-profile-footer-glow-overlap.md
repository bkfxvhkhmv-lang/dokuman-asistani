# Audit: Profile Footer Scan Glow Overlap

**Date:** 2026-06-02
**Commit:** (see git log)
**Status:** FIXED

## Problem

Settings screen version text ("BriefPilot v4.0.0") was rendered
at `paddingBottom: safeBottom + 88`. The bottom tab bar scan button
has a circular glow that extends ~30–40px above the tab bar surface.
On Android (safeBottom ≈ 0), total clearance was only 88px — not
enough to clear the glow, causing contrast loss and overlap.

## Root Cause

`EinstellungenScreen.tsx` used a hardcoded `88` offset instead of
the actual tab bar height. The scan FAB glow is part of the tab bar
design and adds visual height beyond the standard bar height (~49px).

## Fix

- Import `useBottomTabBarHeight` from `@react-navigation/bottom-tabs`
- Replace `paddingBottom: safeBottom + 88` with
  `paddingBottom: tabBarHeight + safeBottom + 32`
- Increase version text container `paddingTop` from 16 → 24
- Add `opacity: 0.6` to version text (sakin, tertiary seviye)

## Files Changed

- `src/features/settings/EinstellungenScreen.tsx`

## Validation

- `npx tsc --noEmit` → exit 0
- Settings screen: version text now clears scan glow on all devices
