# Fix: Attention Colors + Scan FAB Halo Polish
**Date:** 2026-06-02  
**Status:** FIXED  
**Risk:** LOW

## Changes

### 1. Stable trend → neutral (SmartRiskPanel.tsx)
- `stable: C.warning` → `stable: C.textTertiary`
- Sabit trend artık amber/sarı değil, muted neutral — sadece kötüleşen trend warning rengi alır.

### 2. Warning attention text → tone-on-tone (AnalyseHeaderCard.tsx)
- `statusColors warning: text: C.warning` → `C.warningText` (dark amber #5C3D00 instead of bright #FFB703)
- `confidenceColor < 75%: C.warning` → `C.warningText`
- `tage <= 7 deadline: C.warning` → `C.warningText`
- Sonuç: "sakin kontrol et" hissi, "alarm" değil.

### 3. Scan FAB halo soften (AuraGlow.tsx + styles.ts)
- Outer halo: `${primaryColor}16` (8.6% opacity) → `${primaryColor}0D` (5%)
- Inner core: `${primaryColor}26` (14.9%) → `${primaryColor}1A` (10%)
- `shadowOpacity: 0.65` → `0.35`
- `shadowRadius: 12` → `7`
- `elevation: 6` → `3`
- Scan butonu görsel önemi korunuyor, glow tab label'lara taşmıyor.

### 4. Document card left stripe (DocumentSurface.tsx)
- `width: 3` → `width: 2` (px)
- Amber/kırmızı şerit görsel ağırlığı düşürüldü, tamamen kaldırılmadı.

## What Was NOT Changed
- Brand primary blue globally
- `C.warning` token itself (still used for bg/border contexts — only text usage changed)
- Dark mode unless the touched tokens required it (warningText has paired dark value in theme)
- Scanner/OCR/signature logic
- Layout or card structure

## Validation
- `npx tsc --noEmit` PASS
- No new user-visible strings
- Scan button still visually prominent
- Stable trend now reads as neutral, not alarming
- Amber attention surfaces calmer without losing legibility
