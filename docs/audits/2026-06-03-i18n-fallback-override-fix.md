# Audit: i18n Fallback Override Fix

**Datum:** 2026-06-03  
**Datei:** `src/i18n/translations.ts`  
**Branch:** feature/ocr-api-integration  

## Symptom

FR / RU / AR Spracheinstellungen zeigten weiterhin englische Bezeichnungen:

| Schlüssel | Erwartet (FR) | Angezeigt |
|---|---|---|
| `common.all` | Tous | **All** |
| `doc.type.invoice_plural` | Factures | **Invoices** |
| `doc.type.authority_group` | Courriers officiels | **Official letters** |
| `search.results_many` | {n} résultats | **{n} results** |

Obwohl diese Schlüssel im FR/RU/AR-Abschnitt korrekt definiert waren, wurde auf dem Gerät stets der englische Wert angezeigt. Betroffen: Kategorie-Chips, Trefferzähler, Dokumentkarten-Labels.

## Ursache

`RUNTIME_SWEEP_FALLBACK` — ein Objekt mit englischen Platzhalterstrings — wurde **am Ende** jedes Sprach-Dicts gespreizt:

```ts
// FALSCH — Fallback überschreibt locale-spezifische Werte
const fr: Dict = {
  'doc.type.invoice_plural': 'Factures',  // ← korrekt gesetzt
  // ...hunderte weitere Einträge...
  ...RUNTIME_SWEEP_FALLBACK,              // ← überschreibt 'Factures' mit 'Invoices'
};
```

In JavaScript gewinnt der letzte Key bei Spread-Operationen. Da `RUNTIME_SWEEP_FALLBACK` auch `doc.type.invoice_plural: 'Invoices'` enthält, wurde jede locale-spezifische Übersetzung runtime überschrieben. Dies erklärt, warum "wir haben die Übersetzung hinzugefügt" nie zu sichtbaren Änderungen geführt hat.

## Fix

Spread-Reihenfolge umgekehrt: Fallback zuerst, locale-Übersetzungen danach.

```ts
// RICHTIG — locale-Werte gewinnen immer
const fr: Dict = {
  ...RUNTIME_SWEEP_FALLBACK,              // ← Standardwerte (englisch)
  'common.all': 'Tous',                   // ← überschreibt 'All'
  'doc.type.invoice_plural': ...,         // ← durch explizite Einträge weiter unten gewonnen
  // ...
};
```

## Änderungen

| Sprache | Aktion |
|---|---|
| `fr` | Spread nach oben verschoben, `common.all: 'Tous'` hinzugefügt |
| `es` | Spread nach oben verschoben, `common.all: 'Todos'` hinzugefügt |
| `ru` | Spread nach oben verschoben, `common.all: 'Все'` hinzugefügt |
| `ar` | Spread nach oben verschoben, `common.all: 'الكل'` hinzugefügt |
| `tr` | `common.all: 'Tümü'` hinzugefügt (kein Spread nötig) |
| `de` | Bereits korrekt — `common.all: 'Alle'` explicit vorhanden |
| `en` | Bereits korrekt — `common.all: 'All'` via RUNTIME_SWEEP_FALLBACK |

## Erwartete Ergebnisse nach Build

| Chip | FR | RU | AR |
|---|---|---|---|
| Alle/All | **Tous** | **Все** | **الكل** |
| Invoices | **Factures** | **Счета** | **فواتير** |
| Official letters | **Courriers officiels** | **Официальные письма** | **خطابات رسمية** |
| Other | Autre ✓ | Другое ✓ | أخرى ✓ |
| {n} results | **{n} résultats** | **{n} результатов** | **{n} نتائج** |

## Validierung

- `npx tsc --noEmit` → **0 Fehler**
- Spread-Reihenfolge verifiziert für alle 4 betroffenen Dicts
- `de` / `tr` unverändert, nicht betroffen
- Kein Eingriff in Scanner, Navigation, OCR-Logik

## Akzeptanzkriterium

**Dieses Task gilt erst als abgeschlossen, wenn folgende Screenshots vorliegen:**

- FR: `Tous / Factures / Courriers officiels / Autre`
- RU: `Все / Счета / Официальные письма / Другое`
- AR: `الكل / فواتير / خطابات رسمية / أخرى`
- TR: `Tümü / Faturalar / Resmî yazılar / Diğer`
- DE: `Alle / Rechnungen / Behörden / Sonstiges`

`tsc PASS` allein ist kein Abnahmekriterium.
