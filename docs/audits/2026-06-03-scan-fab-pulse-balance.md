# Audit: Scan FAB Central Pulse Balance

**Datum:** 2026-06-03  
**Datei:** `src/navigation/mainTabsConfig.tsx`  
**Branch:** feature/ocr-api-integration  

## Problem

Der vorige Halo-Polish-Commit hat die äußere Aura korrekt verkleinert (`pulseScale` 1.52 → 1.28), dabei aber die zentrale Pulsring-Sichtbarkeit übermäßig reduziert. Der Scan-Button wirkte leblos.

## Analyse

| Eigenschaft | Vor Halo-Polish (Backup) | Nach Halo-Polish (zu schwach) | Nach diesem Fix |
|---|---|---|---|
| `pulseScale` max | 1.52 | 1.28 | **1.28** (unverändert) |
| `pulseOpacity` peak | 0.45 | 0.26 | **0.45** (wiederhergestellt) |
| `pulseOpacity` mid | 0.15 | 0.09 | **0.15** (wiederhergestellt) |
| `borderWidth` | 2 | 1.25 | **1.8** |
| `borderColor` | `colors.primary` | `colors.primary + CC` (80%) | **`colors.primary`** (100%) |

**Schlüsselerkenntnis:** Die Aura-Breite wird ausschließlich durch `pulseScale` gesteuert. Opacity und Randstärke beeinflussen nur die Sichtbarkeit, nicht den Radius. Daher können diese Werte sicher restauriert werden, ohne die Halo-Verkleinerung rückgängig zu machen.

## Änderungen

```diff
- const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.26, 0.09, 0] });
+ const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.45, 0.15, 0] });

- borderWidth: 1.25, borderColor: `${colors.primary}CC`,
+ borderWidth: 1.8,  borderColor: colors.primary,
```

## Validierung

- `npx tsc --noEmit` → **0 Fehler**
- `pulseScale` bleibt bei `[1, 1.28]` — Halo-Radius unverändert
- Keine Änderungen an: Button-Position, -Größe, Tap-Target, Navigation, i18n, Android/iOS-Logik

## Ergebnis

- Zentraler Pulsring wieder sichtbar (Opacity 0.45 Peak)
- Äußere Aura bleibt schmal (Scale max 1.28, war 1.52)
- Kein neuer Animation-Layer hinzugefügt
- Keine Neon-/Aggressive-Optik
