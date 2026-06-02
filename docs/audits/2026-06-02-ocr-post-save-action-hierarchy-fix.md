# Fix: P1 #6 — OCR Post-Save Action Hierarchy
**Date:** 2026-06-02  
**Status:** FIXED  
**Risk:** LOW

## Problem
Nach dem Speichern blieb der Ergebnis-Screen als gleichwertiger "Workbench":
- `Neue Analyse` hatte dasselbe visuelle Gewicht wie `Dokument öffnen`
- `OcrMvpActionSummary` (Export/Preview) wirkte genauso dominant wie der primäre CTA

## Fix

**Datei:** `src/features/ocr-mvp/components/OcrMvpResultCard.tsx`

1. `Neue Analyse`-Button nach Save: `opacity: 0.45`, `fontSize: 12` → klar untergeordnet
2. `OcrMvpActionSummary` + Fallback-Aktionen nach Save: in `secondaryZone`-Wrapper (`opacity: 0.7`) + `secondaryDivider` (hairline) → visuell von primärem CTA getrennt

## Was NICHT geändert wurde
- `onReset` / `handleReset` Logik
- `isSavedToDocuments` State-Logik
- `onOpenDocument` CTA
- `OcrMvpActionSummary` Komponente intern
- translations.ts
- Alle Handler/Callbacks unverändert

## Validation
- `npx tsc --noEmit` PASS
- Vor Save: alle Buttons gleich sichtbar wie vorher
- Nach Save: `Dokument öffnen` dominant, `Neue Analyse` und Export visuell zurückgesetzt

## Commit
fix(ux): demote post-save secondary actions in OCR result screen
