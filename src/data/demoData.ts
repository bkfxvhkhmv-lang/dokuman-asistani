import type { Dokument } from '../store';

export const DEMO_DOKUMENTE: Dokument[] = [
  {
    id: '1', titel: 'Bußgeldbescheid — Düsseldorf', typ: 'Bußgeld',
    absender: 'Stadt Düsseldorf · Ordnungsamt',
    zusammenfassung: 'Geschwindigkeitsüberschreitung am 03.04.2026, Königsallee. Bußgeld: 48,50 €. Zahlung oder Einspruch innerhalb von 2 Wochen.',
    warnung: 'Nach Fristablauf wird eine Mahnung mit 28,50 € Zusatzgebühr verschickt.',
    betrag: 48.50, waehrung: '€', frist: new Date(Date.now() + 2*86400000).toISOString(),
    risiko: 'hoch', aktionen: ['zahlen','einspruch','kalender','mail'],
    datum: new Date(Date.now() - 3*86400000).toISOString(), gelesen: false, erledigt: false, uri: null, rohText: null,
  },
  {
    id: '2', titel: 'Finanzamt — Steuerbescheid 2023', typ: 'Behörde',
    absender: 'Finanzamt Köln-Mitte',
    zusammenfassung: 'Einkommensteuerbescheid 2023. Nachzahlung: 312,00 €. Frist: 14. April 2026.',
    warnung: 'Säumniszuschläge (1% pro Monat) bei Nichtzahlung.',
    betrag: 312.00, waehrung: '€', frist: new Date(Date.now() + 4*86400000).toISOString(),
    risiko: 'hoch', aktionen: ['zahlen','einspruch','kalender','mail'],
    datum: new Date(Date.now() - 5*86400000).toISOString(), gelesen: false, erledigt: false, uri: null, rohText: null,
  },
  {
    id: '3', titel: 'Hausarzt — Terminbestätigung', typ: 'Termin',
    absender: 'Dr. med. Andrea Schmidt',
    zusammenfassung: 'Termin am Dienstag, 15. April 2026 um 14:30 Uhr. Musterstraße 12, 50667 Köln.',
    warnung: 'Ausfallgebühr 30 € bei Nichtteilnahme ohne Absage.',
    betrag: null, waehrung: '€', frist: new Date(Date.now() + 5*86400000).toISOString(),
    risiko: 'mittel', aktionen: ['kalender'],
    datum: new Date(Date.now() - 2*86400000).toISOString(), gelesen: true, erledigt: false, uri: null, rohText: null,
  },
  {
    id: '4', titel: 'Rundfunkbeitrag — Mahnung', typ: 'Mahnung',
    absender: 'ARD ZDF Deutschlandradio Beitragsservice',
    zusammenfassung: 'Rückstand Q1 2026: 55,08 €. Letzte Mahnung vor Vollstreckung.',
    warnung: 'Vollstreckungsverfahren + bis zu 100 € Verwaltungsgebühren.',
    betrag: 55.08, waehrung: '€', frist: new Date(Date.now() + 6*86400000).toISOString(),
    risiko: 'mittel', aktionen: ['zahlen','kalender','mail'],
    datum: new Date(Date.now() - 1*86400000).toISOString(), gelesen: false, erledigt: false, uri: null, rohText: null,
  },
  {
    id: '5', titel: 'Vodafone — Rechnung März 2026', typ: 'Rechnung',
    absender: 'Vodafone GmbH',
    zusammenfassung: 'Monatliche Rechnung 89,95 €. SEPA-Lastschrift am 22. April.',
    warnung: null, betrag: 89.95, waehrung: '€',
    frist: new Date(Date.now() + 12*86400000).toISOString(),
    risiko: 'niedrig', aktionen: [],
    datum: new Date(Date.now() - 7*86400000).toISOString(), gelesen: true, erledigt: false, uri: null, rohText: null,
  },
];
