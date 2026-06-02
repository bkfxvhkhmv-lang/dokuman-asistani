# Fix: Generated Document Labels i18n Cleanup
**Date:** 2026-06-02  
**Commit:** 8e3d8f5fc  
**Status:** FIXED (main visible items)

## Root Cause

App-generated UI labels (status badges, lifecycle summaries, action titles) were producing German strings regardless of selected locale. They used hardcoded German strings instead of T()/labelKey patterns.

## Fixed

### 1. "Offen" status badge → Açık / Open / Ouvert
`documentStatus.ts`: `DOCUMENT_STATUS_UI.label` → `labelKey`  
`AnalyseHeaderCard.tsx`: `statusUi.label` → `T(statusUi.labelKey)`  
Keys used: `home.filter.open` (all 7 locales) ✅

### 2. "In Prüfung · Zahlung erforderlich" → "İncelemede · Ödeme gerekli"
`LifecyclePrediction.ts`:
- `PHASE_LABELS` → `PHASE_LABEL_KEYS` (maps to existing `detail.status.*` keys)
- `NEXT_ACTION_MAP.action` → `actionKey` (maps to new `detail.lifecycle.action.*` keys)
- `summarize()` + `predict()` use `getLangSync()` + `t()` for all strings
- Deadline strings use `doc.overdue`, `doc.due_today`, `doc.due_days`

### 3. "Zahlungsdaten prüfen" action title → "Ödeme bilgilerini kontrol et"
`ACTION_META.zahlendaten.labelKey = 'detail.review.check_payment_data'` already existed  
Added TR/EN/FR/ES/RU/AR translations for this key.

## New Translation Keys (7 locales each)
- `detail.lifecycle.phase.received`
- `detail.lifecycle.phase.waiting`
- `detail.lifecycle.action.zahlen`
- `detail.lifecycle.action.einspruch`
- `detail.lifecycle.action.kalender`
- `detail.lifecycle.action.mail`
- `detail.review.check_payment_data` (was DE-only)

## Remaining (Non-Blocking Backlog)
Still hardcoded in service layer (not visible in current screenshots):
- `SmartActionsService.ts` — action labels (service not rendered in current UI)
- `documentSuggestions.ts` — suggestion builder strings
- `actionMapping.ts` sublabels — fallback only when digitalTwin is null
- `kernPunkte.ts` — AI summary bullet points (AI-generated text, acceptable in DE)
