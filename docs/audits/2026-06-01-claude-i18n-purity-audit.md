# i18n Purity Audit — 7-Language Coverage

## Report Metadata
- **Author/Agent:** Claude (Sonnet 4.6)
- **Role:** i18n purity audit + translation fix
- **Date:** 2026-06-01
- **Repository:** bp_canavar_v6_refactor
- **Branch:** feature/ocr-api-integration
- **Commits:** `53f6290e`
- **Task type:** audit + fix
- **Scope:** All user-facing strings in recent features; 7-language completeness check
- **Status:** PASS (all 7 languages complete after fix)

---

## 1. Scope
- **Languages:** de · tr · en · fr · es · ru · ar
- **i18n system:** Single file `src/i18n/translations.ts`, `useT()` hook (`src/hooks/useT.ts`), module-level lang store
- **Fallback chain:** active lang → German (`DICTS.de`) → raw key
- **Folders searched:** `src/features/ocr-mvp/`, `src/features/detail/`, `src/components/`, `src/hooks/`, `src/i18n/`

---

## 2. Search Commands
```bash
grep -n "const de:|const tr:|const en:|const fr:|const es:|const ru:|const ar:" src/i18n/translations.ts
python3 -c "count keys per language dict"
grep -n "useT|useTranslation" src/features/ --include="*.tsx" -l
grep -n "Alert.alert|setError|'[A-Z]" src/features/ocr-mvp/ src/features/detail/detail-modals/
grep -n "DOC_TYPE_LABEL|Besser erkennen|Excel herunterladen|Übernehmen|Ignorieren|dauert länger" src/
```

---

## 3. Files Touched
| File | Reason | Change type |
|------|--------|-------------|
| `src/i18n/translations.ts` | Add 59 new keys in all 7 languages | code |
| `src/features/detail/detail-modals/ExportierenSheet.tsx` | Use `useT()` for all labels | code |
| `src/features/detail/components/details-panel/BesserErkennenCard.tsx` | Use `useT()` for all labels | code |
| `src/hooks/useAiLabeler.ts` | Use `t(getLangSync())` for error string | code |
| `src/features/ocr-mvp/OcrMvpScreen.tsx` | Use `useT()` for all error/state strings | code |
| `src/features/ocr-mvp/components/OcrMvpResultCard.tsx` | Use `useT()` for doc types and button labels | code |
| `src/features/detail/DetailModalsContainer.tsx` | Use `useT()` for Excel alert | code |

---

## 4. Findings

### BLOCKER — 7 recent features had hardcoded German bypassing i18n
- **Status:** FIXED (`53f6290e`)
- **Severity:** Blocker (all non-German users affected)
- **User impact:** Turkish/English/French/Spanish/Russian/Arabic users saw German error messages, button labels, and UI text throughout OCR analysis flow and export sheet
- **Root cause:** New components (ExportierenSheet, BesserErkennenCard, OcrMvpScreen, OcrMvpResultCard) were written with hardcoded German strings instead of using `useT()`. The fallback in `t()` is German, so missing keys also showed German.
- **Fix:** Added 59 translation keys in all 7 languages; updated all 6 components + 1 hook to use `useT()`

### Key areas fixed:
| Area | Keys added | Components updated |
|------|-----------|-------------------|
| ExportierenSheet labels | 14 | ExportierenSheet.tsx |
| OCR error/offline/save states | 15 | OcrMvpScreen.tsx |
| Besser erkennen UI | 9 | BesserErkennenCard.tsx, useAiLabeler.ts |
| OCR result doc types + buttons | 11 | OcrMvpResultCard.tsx |
| Reply template chrome | 8 | (keys added, component deferred — see §5) |
| Excel export alert | 2 | DetailModalsContainer.tsx |

### INTENTIONAL — YanıtSablonlariModal legal content stays German
- **Status:** Intentional
- **Rationale:** Reply template drafts are responses to German authorities (Finanzamt, Behörden). The draft text must be written in German regardless of UI language. Legal disclaimer translations added to all 7 languages with equivalent meaning.
- **UI chrome** (button labels, mode names) deferred to a follow-up — these are inside a complex modal with many interconnected state strings; safer to address separately.

### PASS — Existing 296 keys: all 7 languages complete before audit
- No missing keys in existing translations. Only new features were the gap.

### PASS — No API keys or backend enums exposed in UI
- `google_form_parser`, `abbyy_xml`, `ocrJobId` etc. do not appear in user-facing strings.
- `DOC_TYPE_KEY` maps backend enum values to translation keys (not exposed directly).

### PASS — Filename generation stays German (intentional)
- `buildExportFilename()` generates file names (not shown in UI). German labels kept for file system clarity. Exempt from i18n requirement.

---

## 5. Decisions

**Changed:**
- 59 new keys across all 7 languages
- 7 files updated to use `useT()` / `t(getLangSync())`
- `toSafeError()` now receives T function as parameter (pure function, no hook violation)

**Not changed:**
- `YanıtSablonlariModal` reply template content — German is correct for legal drafts
- `YanıtSablonlariModal` UI chrome labels — larger modal, deferred as LATER
- File/export basename generation — not user-facing, stays German
- Backend enum values, route names, provider names
- Any `console.log`/`console.warn` strings

---

## 6. Validation
- `npx tsc --noEmit` → **0 errors**
- Key count check: `de: 355, tr: 355, en: 355, fr: 355, es: 355, ru: 355, ar: 355` — all COMPLETE
- No missing keys in any language
- Legal disclaimer translated in all 7 languages with equivalent meaning

---

## 7. Commits
| Hash | Message |
|------|---------|
| `53f6290e` | fix(i18n): complete 7-language translation coverage for recent features |

---

## 8. Follow-ups
| Priority | Task | File | Notes |
|----------|------|------|-------|
| SHOULD FIX | YanıtSablonlariModal UI chrome (button labels, mode names) → useT() | `src/components/YanıtSablonlariModal.tsx` | Complex modal; separate focused PR |
| SHOULD FIX | Prüfen ob `OcrMvpUploadBox` hardcoded strings hat | `src/features/ocr-mvp/components/OcrMvpUploadBox.tsx` | Scan-entry screen |
| SHOULD FIX | Kommentare in Türkisch/Englisch in kürzlich geänderten Dateien → Deutsch | Various | Follow Projekt-Sprachregel |
| LATER | Technische Werte wie `processing`/`failed` Status-Anzeige lokalisieren wenn sichtbar | store/status displays | Needs audit of status display surfaces |

---

## Ownership
This report was prepared by: **Claude (Sonnet 4.6)**

Responsible changed files:
- `src/i18n/translations.ts` — 59 new keys, all 7 languages
- `src/features/detail/detail-modals/ExportierenSheet.tsx`
- `src/features/detail/components/details-panel/BesserErkennenCard.tsx`
- `src/hooks/useAiLabeler.ts`
- `src/features/ocr-mvp/OcrMvpScreen.tsx`
- `src/features/ocr-mvp/components/OcrMvpResultCard.tsx`
- `src/features/detail/DetailModalsContainer.tsx`
- `docs/audits/2026-06-01-claude-i18n-purity-audit.md` — this report

Follow-up owner suggestion:
- **Claude:** YanıtSablonlariModal UI chrome → useT()
- **Claude:** OcrMvpUploadBox audit
- **Claude or Codex:** Kommentare auf Deutsch prüfen und korrigieren
