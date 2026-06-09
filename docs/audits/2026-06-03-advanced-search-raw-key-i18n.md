# Audit: Advanced Search Raw Key & i18n Fix

**Datum:** 2026-06-03  
**Branch:** feature/ocr-api-integration  

## Problem

Advanced Search / Search Filter sheet hat rohe i18n-Schlüssel im UI gerendert:

| Rohschlüssel | Ort |
|---|---|
| `common.from_amount` | Filter-Label Betrag-Start |
| `common.to_amount` | Filter-Label Betrag-Ende |
| `search.example_50` | Placeholder |
| `search.example_500` | Placeholder |
| `SEARCH.RANGE` | Abschnitt-Header (uppercase raw) |
| `SEARCH.SCOPE` | Abschnitt-Header |
| `SEARCH.REVIEW_STATUS` | Abschnitt-Header |
| `search.reset` | Button-Label |
| `search.apply` | Button-Label |
| `Intelligente Suche aktiv` | Hardcode DE in SearchHints.tsx |
| `Text / Kombiniert / Intelligent` | Hardcode DE in SearchHints.tsx |
| `Keine Treffer` | Hardcode DE in Suchbildschirm.tsx |
| `INTELLIGENTE TREFFER` | Hardcode DE in Suchbildschirm.tsx |
| `Intelligente Suche` | Hardcode DE in SemanticKarte.tsx |

## Ursache

Keys wurden in `translations.ts` nie definiert. Das `t()`-System gibt bei fehlendem Schlüssel den Schlüssel selbst zurück — daher `search.reset` statt „Sıfırla". Zusätzlich waren etliche Strings im Code hartkodiert auf Deutsch.

## Durchgeführte Änderungen

### translations.ts — Neue Schlüssel in 7 Sprachen

Folgende Schlüssel wurden in DE / TR / EN / FR / ES / RU / AR hinzugefügt:

```
common.from / common.to
common.from_amount / common.to_amount
search.example_50 / search.example_500
search.range / search.scope / search.review_status
search.reset / search.apply
search.mode.smart_active
search.mode.text / search.mode.combined / search.mode.smart
search.hints.detected / search.correction.hint
search.smart.loading / search.smart.hits / search.no_results
search.date_placeholder / search.semantic_label
search.mode.smart_error
search.empty.subtitle / search.empty.search_hint
```

### SearchHints.tsx

- `useT()` importiert
- `V4Banner`: "Intelligente Suche aktiv" → `T('search.mode.smart_active')`
- `V4Banner`: Labels-Array `['Text','Kombiniert','Intelligent']` → T()-Schlüssel
- `ParsedHints`: "Erkannt:" → `T('search.hints.detected')`
- `CorrectionHint`: "Meinten Sie:" → `T('search.correction.hint')`

### SearchFilterModal.tsx

- Datums-Placeholder `"TT.MM.JJJJ"` → `T('search.date_placeholder')`
- Reset-Button: `C.danger`-Farbe → `C.border` / `C.textSecondary` (neutral, nicht destruktiv)

### Suchbildschirm.tsx

- "Intelligente Suche läuft…" → `t('search.smart.loading')`
- "{n} INTELLIGENTE TREFFER" → `t('search.smart.hits', { n })`
- "Keine Treffer" (2×) → `t('search.no_results')`
- EmptyState subtitle/action → lokalisierte T()-Aufrufe
- `v4Fehler`-Fehleranzeige → `t(v4Fehler)` (Schlüssel kommt aus useSearchState)

### SemanticKarte.tsx

- `useT()` importiert
- "Intelligente Suche" → `T('search.semantic_label')`

### useSearchState.ts

- Hardkodierter DE-Fehlerstring → `'search.mode.smart_error'` (Schlüssel)

## Validierung

- `npx tsc --noEmit` → **0 Fehler**
- Grep: kein rohes Schlüssel-Rendering außerhalb von `translations.ts`

```
grep: common.to_amount|search.example_500|SEARCH.RANGE|... → nur T()-Aufrufe, keine user-visible literals
```

## Akzeptanzkriterium

Filter-Sheet TR: Başlangıç tutarı / Bitiş tutarı / Örn. 500 / Tarih aralığı / Kapsam / Kontrol durumu / Sıfırla / Uygula  
Filter-Sheet DE: Von (Betrag) / Bis (Betrag) / z. B. 500 / Zeitraum / Bereich / Prüfstatus / Zurücksetzen / Anwenden  
Kein roher Schlüssel im sichtbaren UI.  
Reset-Button: neutral (kein Rot).  

**Abnahme nur per Screenshot.**
