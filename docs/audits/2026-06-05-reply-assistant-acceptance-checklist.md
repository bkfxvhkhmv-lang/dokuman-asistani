# Reply Assistant — Final Acceptance Checklist

**Datum:** 2026-06-05  
**Commit:** ecb116c4e fix(reply): stabilize sheet layout and safety warning state  
**Branch:** feature/ocr-api-integration  
**Modus:** Manueller Cihaz-Test — kein Code, kein Commit  

---

## Quellcode-Vorvalidierung (statisch)

Vor dem Gerätetest wurden folgende Invarianten anhand des Quellcodes verifiziert:

| Prüfpunkt | Ergebnis |
|-----------|----------|
| `bussgeld_akten_einsicht_009` → `riskLevel: 'low'`, `requiresLegalCaution: false` | ✅ bestätigt |
| `bussgeld_general_einspruch_005` → `riskLevel: 'high'`, `requiresLegalCaution: true` | ✅ bestätigt |
| `finanzamt_einspruch_fristwahrung_002` → `riskLevel: 'high'`, `requiresLegalCaution: true` | ✅ bestätigt |
| `schufa_selbstauskunft_001` → `riskLevel: 'low'`, `requiresLegalCaution: false` | ✅ bestätigt |
| `shouldShowHighRiskWarning()` prüft `riskLevel === 'high' \|\| requiresLegalCaution === true` | ✅ bestätigt |
| Global-Banner immer sichtbar (alle Steps: select/fill/preview) | ✅ bestätigt |
| Amber-Banner nur in FillStep + PreviewStep, nur wenn `shouldShowHighRiskWarning()` | ✅ bestätigt |
| `Entwurf kopieren` = einzige Output-Aktion (kein Senden, kein Export, kein Share) | ✅ bestätigt |
| Field-Labels zeigen aktuell rohe Keys (`aktenzeichen`, `adresse` …) | ⚠ bekannt — nächste Aufgabe |

---

## iOS — Cihaz-Test

### TC-01 · Bußgeld → Antrag auf Akteneinsicht
Template-ID: `bussgeld_akten_einsicht_009` · Risk: **low**

| # | Schritt | Erwartet | Ergebnis |
|---|---------|----------|----------|
| 1 | Feature öffnen | Global-Banner sichtbar | ☐ PASS / ☐ FAIL |
| 2 | Feature öffnen | Amber-High-Risk-Banner NICHT sichtbar | ☐ PASS / ☐ FAIL |
| 3 | Template wählen → Fill-Step | Pflichtfelder: `aktenzeichen`, `name`, `adresse` | ☐ PASS / ☐ FAIL |
| 4 | Tippen auf Feld | Tastatur erscheint, aktives Feld bleibt sichtbar | ☐ PASS / ☐ FAIL |
| 5 | Zwischen Feldern wechseln | Tastatur bleibt offen, kein Layout-Sprung | ☐ PASS / ☐ FAIL |
| 6 | Pflichtfelder leer | „Entwurf erstellen" disabled (ausgegraut) | ☐ PASS / ☐ FAIL |
| 7 | Alle Pflichtfelder ausfüllen | „Entwurf erstellen" enabled | ☐ PASS / ☐ FAIL |
| 8 | „Entwurf erstellen" tippen | Preview-Step öffnet | ☐ PASS / ☐ FAIL |
| 9 | Preview-Step | SafetyNote sichtbar (unter Betreff/Inhalt) | ☐ PASS / ☐ FAIL |
| 10 | Preview-Step | „Entwurf kopieren"-Button vollständig sichtbar | ☐ PASS / ☐ FAIL |
| 11 | „Entwurf kopieren" tippen | Button → „✓ Kopiert", Text in Zwischenablage | ☐ PASS / ☐ FAIL |
| 12 | Preview-Step | Kein Senden / Gönder / Export / Share sichtbar | ☐ PASS / ☐ FAIL |

**Fazit TC-01:** ☐ PASS / ☐ FAIL  
**Notizen:**

---

### TC-02 · Bußgeld → Einspruch zur Fristwahrung
Template-ID: `bussgeld_general_einspruch_005` · Risk: **high**

| # | Schritt | Erwartet | Ergebnis |
|---|---------|----------|----------|
| 1 | Feature öffnen | Global-Banner sichtbar | ☐ PASS / ☐ FAIL |
| 2 | Template wählen → Fill-Step | Amber-High-Risk-Banner sichtbar | ☐ PASS / ☐ FAIL |
| 3 | Fill-Step | Tastatur / Scroll-Verhalten OK | ☐ PASS / ☐ FAIL |
| 4 | „Entwurf erstellen" → Preview-Step | Amber-High-Risk-Banner in Preview ebenfalls sichtbar | ☐ PASS / ☐ FAIL |
| 5 | Preview-Step | „Entwurf kopieren" vollständig sichtbar (nicht abgeschnitten) | ☐ PASS / ☐ FAIL |
| 6 | Preview-Step | Kein Senden / Export / Share | ☐ PASS / ☐ FAIL |

**Fazit TC-02:** ☐ PASS / ☐ FAIL  
**Notizen:**

---

### TC-03 · Finanzamt → Einspruch zur Fristwahrung
Template-ID: `finanzamt_einspruch_fristwahrung_002` · Risk: **high**

| # | Schritt | Erwartet | Ergebnis |
|---|---------|----------|----------|
| 1 | Template wählen → Fill-Step | Amber-High-Risk-Banner sichtbar | ☐ PASS / ☐ FAIL |
| 2 | Fill-Step | Pflichtfelder ausfüllbar, Tastatur OK | ☐ PASS / ☐ FAIL |
| 3 | Preview-Step | Amber-Banner sichtbar | ☐ PASS / ☐ FAIL |
| 4 | Preview-Step | „Entwurf kopieren" sichtbar, funktioniert | ☐ PASS / ☐ FAIL |
| 5 | Preview-Step | Kein Senden / Export / Share | ☐ PASS / ☐ FAIL |

**Fazit TC-03:** ☐ PASS / ☐ FAIL  
**Notizen:**

---

### TC-04 · Schufa → Datenkopie / Selbstauskunft
Template-ID: `schufa_selbstauskunft_001` · Risk: **low** · Kandidaten: 1

| # | Schritt | Erwartet | Ergebnis |
|---|---------|----------|----------|
| 1 | Feature öffnen | Global-Banner sichtbar | ☐ PASS / ☐ FAIL |
| 2 | Select-Step | Amber-High-Risk-Banner NICHT sichtbar | ☐ PASS / ☐ FAIL |
| 3 | Select-Step | Genau 1 Kandidat angezeigt | ☐ PASS / ☐ FAIL |
| 4 | Template wählen → Fill-Step | Pflichtfelder ausfüllbar, Tastatur OK | ☐ PASS / ☐ FAIL |
| 5 | Preview-Step | „Entwurf kopieren" sichtbar, funktioniert | ☐ PASS / ☐ FAIL |
| 6 | Preview-Step | Kein Senden / Export / Share | ☐ PASS / ☐ FAIL |

**Fazit TC-04:** ☐ PASS / ☐ FAIL  
**Notizen:**

---

## Android — Smoke (nach iOS)

### TC-A1 · Low-Risk Template (z. B. Bußgeld → Akteneinsicht)

| # | Schritt | Erwartet | Ergebnis |
|---|---------|----------|----------|
| 1 | Fill-Step | Amber-Banner NICHT sichtbar | ☐ PASS / ☐ FAIL |
| 2 | Fill-Step | Tastatur / Scroll OK | ☐ PASS / ☐ FAIL |
| 3 | Preview-Step | „Entwurf kopieren" vollständig sichtbar | ☐ PASS / ☐ FAIL |
| 4 | Preview-Step | Kein Senden / Export / Share | ☐ PASS / ☐ FAIL |

**Fazit TC-A1:** ☐ PASS / ☐ FAIL

---

### TC-A2 · High-Risk Template (z. B. Bußgeld → Einspruch)

| # | Schritt | Erwartet | Ergebnis |
|---|---------|----------|----------|
| 1 | Fill-Step | Amber-High-Risk-Banner sichtbar | ☐ PASS / ☐ FAIL |
| 2 | Fill-Step | Tastatur / Scroll OK | ☐ PASS / ☐ FAIL |
| 3 | Preview-Step | „Entwurf kopieren" vollständig sichtbar | ☐ PASS / ☐ FAIL |
| 4 | Preview-Step | Kein Senden / Export / Share | ☐ PASS / ☐ FAIL |

**Fazit TC-A2:** ☐ PASS / ☐ FAIL

---

## Gesamtergebnis

| Platform | Ergebnis |
|----------|----------|
| iOS TC-01 (Akteneinsicht low-risk) | ☐ PASS / ☐ FAIL |
| iOS TC-02 (Einspruch high-risk) | ☐ PASS / ☐ FAIL |
| iOS TC-03 (Finanzamt Einspruch high-risk) | ☐ PASS / ☐ FAIL |
| iOS TC-04 (Schufa low-risk, 1 Kandidat) | ☐ PASS / ☐ FAIL |
| Android TC-A1 (low-risk smoke) | ☐ PASS / ☐ FAIL |
| Android TC-A2 (high-risk smoke) | ☐ PASS / ☐ FAIL |

**Gesamturteil:** ☐ ACCEPTED / ☐ BLOCKED  

---

## Bekannte Lücken (kein Blocker)

- **Field-Labels:** Felder zeigen rohe Keys (`aktenzeichen`, `geburtsdatum` …) statt lesbarer Bezeichnungen. Nächste Aufgabe: `fix(reply): polish field labels`.
- **Feature-Flag:** `__DEV__`-Guard aktiv — in Produktion nicht zugänglich. Beta-Flag-Entscheidung steht aus.

---

## Nächste Aufgabe (nach ACCEPTED)

```
fix(reply): polish field labels

Ziel: Menschenlesbare Deutsche Labels für Pflicht-/Optionalfelder.
Regeln:
- Unterl. Field-Keys unverändert
- Nur sichtbare Labels ändern
- Fallback: snake_case → Title Case
- Keine türkischen Labels in der deutschen UI
Validierung: tsc --noEmit + reply tests + iOS-Kurzcheck
```
