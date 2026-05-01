import type { Dokument } from '@/store';

const d = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString();

export const DEMO_DOKUMENTE: Dokument[] = [
  {
    id: 'demo_1',
    titel: 'Bußgeldbescheid — Ordnungsamt Düsseldorf',
    typ: 'Behörden / Amt',
    absender: 'Stadt Düsseldorf · Ordnungsamt',
    zusammenfassung:
      'Geschwindigkeitsüberschreitung am 03.04.2026, Königsallee. Bußgeld: 48,50 €. Zahlung oder Einspruch innerhalb von 2 Wochen ab Zustelldatum.',
    warnung:
      'Nach Fristablauf: Mahnung + 28,50 € Verwaltungsgebühr. Einspruch bis zum Fristdatum möglich.',
    betrag: 48.50, waehrung: '€',
    frist: d(3),
    risiko: 'hoch',
    aktionen: ['zahlen', 'einspruch', 'kalender'],
    datum: d(-3), gelesen: false, erledigt: false, uri: null, rohText: null,
  },
  {
    id: 'demo_2',
    titel: 'Einkommensteuerbescheid 2023',
    typ: 'Steuer',
    absender: 'Finanzamt Köln-Mitte',
    zusammenfassung:
      'Einkommensteuerbescheid 2023. Nachzahlung 312,00 €. Fällig am 14. Mai 2026. Einspruchsfrist: 1 Monat ab Zustellung.',
    warnung:
      'Säumniszuschläge ab Fälligkeitstag (1 % pro Monat des rückständigen Betrags).',
    betrag: 312.00, waehrung: '€',
    frist: d(13),
    risiko: 'hoch',
    aktionen: ['zahlen', 'einspruch', 'kalender'],
    datum: d(-5), gelesen: false, erledigt: false, uri: null, rohText: null,
  },
  {
    id: 'demo_3',
    titel: 'Mahnung — Rundfunkbeitrag Q1 2026',
    typ: 'Mahnung / Zahlungserinnerung',
    absender: 'ARD ZDF Deutschlandradio Beitragsservice',
    zusammenfassung:
      'Rückstand Q1 2026: 55,08 €. Letzte Mahnung vor Einleitung des Vollstreckungsverfahrens.',
    warnung:
      'Vollstreckungsverfahren + bis zu 100 € Verwaltungsgebühren bei weiterer Nichtzahlung.',
    betrag: 55.08, waehrung: '€',
    frist: d(6),
    risiko: 'mittel',
    aktionen: ['zahlen', 'kalender'],
    datum: d(-1), gelesen: false, erledigt: false, uri: null, rohText: null,
  },
  {
    id: 'demo_4',
    titel: 'Vodafone — Rechnung März 2026',
    typ: 'Rechnungen',
    absender: 'Vodafone GmbH',
    zusammenfassung:
      'Monatliche Rechnung 89,95 €. SEPA-Lastschrift am 22. Mai 2026 vom hinterlegten Konto.',
    warnung: null,
    betrag: 89.95, waehrung: '€',
    frist: d(21),
    risiko: 'niedrig',
    aktionen: ['zahlen'],
    datum: d(-7), gelesen: true, erledigt: false, uri: null, rohText: null,
  },
  {
    id: 'demo_5',
    titel: 'Kfz-Versicherung — Beitragserhöhung',
    typ: 'Versicherung',
    absender: 'HUK-Coburg Versicherung AG',
    zusammenfassung:
      'Beitragsanpassung ab 01.07.2026: +18,40 € monatlich. Kündigungsrecht bis 30 Tage nach Zugang.',
    warnung:
      'Sonderkündigungsrecht besteht — fristgerechte Kündigung spart 220 € / Jahr.',
    betrag: 18.40, waehrung: '€',
    frist: d(28),
    risiko: 'mittel',
    aktionen: ['einspruch', 'kalender'],
    datum: d(-2), gelesen: false, erledigt: false, uri: null, rohText: null,
  },
  {
    id: 'demo_6',
    titel: 'Arzttermin — Internist Dr. Schmidt',
    typ: 'Behörden / Amt',
    absender: 'Gemeinschaftspraxis Musterstraße',
    zusammenfassung:
      'Termin am 15. Mai 2026, 14:30 Uhr. Musterstraße 12, 50667 Köln. Bitte 15 Min. früher erscheinen.',
    warnung: 'Ausfallgebühr 30 € bei Nichtteilnahme ohne rechtzeitige Absage.',
    betrag: null, waehrung: '€',
    frist: d(14),
    risiko: 'niedrig',
    aktionen: ['kalender'],
    datum: d(-2), gelesen: true, erledigt: false, uri: null, rohText: null,
  },
  {
    id: 'demo_7',
    titel: 'Mietvertrag — Nebenkosten-Nachzahlung 2025',
    typ: 'Rechnungen',
    absender: 'Wohnungsbaugesellschaft Köln mbH',
    zusammenfassung:
      'Betriebskosten-Abrechnung 2025. Nachzahlung: 184,60 €. Zahlungsfrist: 30 Tage ab Zugang.',
    warnung: null,
    betrag: 184.60, waehrung: '€',
    frist: d(30),
    risiko: 'niedrig',
    aktionen: ['zahlen', 'kalender'],
    datum: d(-10), gelesen: true, erledigt: false, uri: null, rohText: null,
  },
  {
    id: 'demo_8',
    titel: 'AOK — Krankenkassenbeitrag April 2026',
    typ: 'Gesundheit',
    absender: 'AOK Rheinland/Hamburg',
    zusammenfassung:
      'Beitragsabrechnung April 2026: 387,00 €. SEPA-Lastschrift am 05. Mai 2026.',
    warnung: null,
    betrag: 387.00, waehrung: '€',
    frist: d(4),
    risiko: 'mittel',
    aktionen: ['zahlen'],
    datum: d(-14), gelesen: true, erledigt: false, uri: null, rohText: null,
  },
];
