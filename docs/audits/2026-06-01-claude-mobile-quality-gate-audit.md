# Mobile Quality Gate Audit — iOS Pre-Android Stabilization

## Report Metadata
- **Author/Agent:** Claude (Sonnet 4.6)
- **Role:** Mobile quality gate audit — code health, UI layout, action flow, i18n
- **Date:** 2026-06-01
- **Repository:** bp_canavar_v6_refactor
- **Branch:** feature/ocr-api-integration
- **Commits:** `54e5d480` (Sicherer Link fix)
- **Task type:** audit + fix
- **Scope:** Code health · UI layout · Product action consistency · i18n/localization
- **Status:** FOLLOW-UP REQUIRED (minor LATER items deferred)

---

## 1. Scope
- **Goal:** Stabilize iOS mobile build before Android work begins
- **Areas:** TypeScript health, dead code, layout risks, action flow gaps, i18n coverage
- **Folders searched:** `src/features/`, `src/components/`, `src/screens/`, `src/hooks/`, `src/services/`, `src/i18n/`, `src/design/`
- **Focus screens:** Home, Document list, Detail, ExportierenSheet, OCR result, Besser erkennen, Antwort-Assistent, Steuerberater export, Settings

---

## 2. Search Commands
```bash
npx tsc --noEmit
grep -rn "TemplateLibrary|ToneAdjuster|chatWithDocument|abbyy" src/
grep -rn "TODO|FIXME|HACK" src/features/ocr-mvp/ src/features/detail/
grep -rn "ANTHROPIC_API_KEY|GOOGLE.*KEY|API_KEY" src/
grep -rn "Falsch gedreht|Drehen|rotate" src/ --include="*.tsx"
grep -rn "Besser erkennen|Excel herunterladen|Frist wahren|Übernehmen|Ignorieren" src/
grep -rn "useTranslation|from '@/i18n'" src/features/ --include="*.tsx" -l
grep -n "ScrollView|maxHeight" src/design/components/AppSheet.tsx
grep -n "onSicherLink|visible_options|filter" src/features/detail/detail-modals/ExportierenSheet.tsx
grep -n "v4DocId" src/features/detail/hooks/document-actions/sharing.ts
```

---

## 3. Files Touched
| File | Reason | Change type |
|------|--------|-------------|
| `src/features/detail/detail-modals/ExportierenSheet.tsx` | Make `onSicherLink` optional + add filter guard | code |
| `src/features/detail/DetailModalsContainer.tsx` | Pass `onSicherLink` only when `dok.v4DocId` present | code |

---

## 4. Findings

### PART 1 — Code Health

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| C1 | `npx tsc --noEmit` → **0 errors** | — | PASS ✅ |
| C2 | `TemplateLibrary`, `ToneAdjuster` — not found in mobile src | — | PASS ✅ |
| C3 | `chatWithDocument` — active in `BelgeChatModal` + `DigestAIService`, not dead | — | Intentional ✅ |
| C4 | `EXPO_PUBLIC_VISION_API_KEY` in `vision-api/constants.ts` — `EXPO_PUBLIC_` prefix = intentionally client-side per Expo convention | — | Intentional ✅ |
| C5 | TODO/FIXME/HACK — 0 found in recently touched areas | — | PASS ✅ |
| C6 | `abbyy` references in mobile src — only in backend provider files, not in mobile UI | — | PASS ✅ |

### PART 2 — UI Layout

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| L1 | `AppSheet` wraps children in plain `View`, not `ScrollView`; `maxHeight: 88%` | LATER | Open |
| L2 | `ExportierenSheet` with 6 options ≈ 312px content + 80px header = ~392px total. On iPhone SE (667px × 88% = ~587px available) → fits. Risk only if more options added. | LATER | Monitor |
| L3 | `ExportierenSheet` item `paddingVertical: 14` = 28px + text ≈ 44-48px per row → meets minimum tap target | — | PASS ✅ |
| L4 | `OcrMvpResultCard` uses `numberOfLines={2}` on field name/value — handles long German labels | — | PASS ✅ |
| L5 | No fixed-width text containers found in recently changed files | — | PASS ✅ |

### PART 3 — Product Action Consistency

| ID | Action | Available | Missing/Broken | Severity | Status |
|----|--------|-----------|----------------|----------|--------|
| A1 | **Excel herunterladen** | OcrMvpResultCard ✅ ExportierenSheet ✅ (affa541) | Non-OCR docs → hidden (intentional) | — | Fixed ✅ |
| A2 | **Originaldatei teilen** | ExportierenSheet ✅ | Local docs: now uses `Sharing.shareAsync(dok.uri)` (93de9c27) | — | Fixed ✅ |
| A3 | **Sicherer Link** | ExportierenSheet | **Was always visible; handler silently failed for all local docs** → now hidden when no `v4DocId` | SHOULD FIX | **Fixed ✅ (54e5d480)** |
| A4 | **PDF exportieren** | ExportierenSheet ✅ OcrMvpResultCard ✅ | — | — | PASS ✅ |
| A5 | **Text-Zusammenfassung** | ExportierenSheet ✅ | — | — | PASS ✅ |
| A6 | **Antwort schreiben** | MoreMenu ✅ | Not in ExportierenSheet — intentional | — | Intentional ✅ |
| A7 | **Vorlesen** | Detail tabs ✅ | — | — | PASS ✅ |
| A8 | **Besser erkennen** | DetailsPanel ✅ | — | — | PASS ✅ |
| A9 | **Delete** | MoreMenu + LoeschenModal ✅ | — | — | PASS ✅ |
| A10 | **Steuerberater export** | ExportBildschirm ✅ | No quick-link from Detail | LATER | Open |
| A11 | **Signieren** | MoreMenu ✅ | — | — | PASS ✅ |

### PART 4 — i18n / Localization

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| I1 | Project is **German-only** — no `useTranslation` hook used in feature components (0 files). Hardcoded German strings are project convention. | — | Intentional ✅ |
| I2 | `src/i18n/translations.ts` (1403 lines) used selectively for tab/nav/common strings. Recent feature strings (Besser erkennen, Excel herunterladen, Übernehmen, etc.) follow existing hardcoded pattern. | — | Intentional ✅ |
| I3 | `"Analyse dauert länger als erwartet"` — in `OcrMvpScreen.tsx:30`. Correct German, in use. | — | PASS ✅ |
| I4 | `"Entwurf · Keine Rechtsberatung"` in `finanzamtAnalysis.ts` (3× hardcoded in template strings). Legal disclaimer — meaning must be preserved. Correctly German. | — | PASS ✅ |
| I5 | `"Frist wahren"`, `"Klärung anfordern"`, `"Begründeter Entwurf"` in `YanıtSablonlariModal.tsx` — German labels, correct. | — | PASS ✅ |
| I6 | `"Falsch gedreht? Im Vollbild drehen"` — **NOT found** in codebase. Already removed or never shipped. | — | PASS ✅ |
| I7 | `"Das Dokument konnte nicht sicher besser erkannt werden"` in `useAiLabeler.ts:39,44` — error string, German, correct. | — | PASS ✅ |

---

## 5. Decisions

**Changed:**
- `onSicherLink` made optional in `ExportierenSheet`; hidden when `dok.v4DocId` missing
- Same guard pattern now applied consistently to: `onMail`, `onOriginal`, `onExcel`, `onSicherLink`

**Not changed:**
- AppSheet `View` vs `ScrollView` — current item count fits all screen sizes; deferred
- Steuerberater quick-link from Detail — separate screen, out of scope for this audit
- i18n architecture — project convention is hardcoded German; no migration planned
- All OCR provider routing, backend logic, payment flows

---

## 6. Validation
- `npx tsc --noEmit` → **0 errors** (before and after fixes)
- No tests broken (no test files cover ExportierenSheet or DetailModalsContainer directly)
- Layout risk: visual device test required for ExportierenSheet overflow on iPhone SE
- Remaining risk: `Sharing.shareAsync` behavior with `.jpg` vs `.pdf` originals not device-tested

---

## 7. Commits
| Hash | Message |
|------|---------|
| `54e5d480` | fix(export): hide Sicherer Link for local docs without v4DocId |

Previous session (same audit scope):
| `affa541` | fix(export): add Excel option to saved document export sheet |
| `93de9c27` | fix(export): share local uri when Originaldatei has no v4DocId |

---

## 8. Follow-ups
| Priority | Task | File | Notes |
|----------|------|------|-------|
| LATER | AppSheet: add ScrollView wrapper when children exceed 5 options | `src/design/components/AppSheet.tsx` | Risk only if more export options added |
| LATER | Steuerberater quick-link from Detail MoreMenu | `src/features/detail/hooks/useDetailMoreItems.ts` | Navigate to ExportBildschirm filtered |
| LATER | Blurlu scan uyarısı: if absender+betrag+datum all null → show retry banner | `src/features/ocr-mvp/components/OcrMvpResultCard.tsx` | No backend change |
| LATER | Suche "Alle" seçili başlangıç: kartlar hemen gösterilmeli | Suche screen | Initial render empty |

---

## Ownership
This report was prepared by: **Claude (Sonnet 4.6)**

Responsible changed files:
- `src/features/detail/detail-modals/ExportierenSheet.tsx` — Sicherer Link guard
- `src/features/detail/DetailModalsContainer.tsx` — conditional onSicherLink
- `docs/audits/2026-06-01-claude-mobile-quality-gate-audit.md` — this report

Follow-up owner suggestion:
- **Claude:** AppSheet scroll safety, Suche initial render fix
- **Claude or Codex:** Steuerberater quick-link from Detail
- **Device test:** Sharing.shareAsync with jpg/pdf originals, ExportierenSheet layout on iPhone SE
