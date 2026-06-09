import type { Dokument } from '@/store';

export function createDemoDokumente(): Dokument[] {
  const d = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toISOString();

  return [
    {
      id: 'demo-bussgeld-duesseldorf',
      isDemo: true,
      titel: 'Bußgeldbescheid — Ordnungsamt Düsseldorf',
      typ: 'Behörden / Amt',
      absender: 'Stadt Düsseldorf · Ordnungsamt',
      zusammenfassung:
        'Geschwindigkeitsüberschreitung am 03.04.2026, Königsallee. Bußgeld: 48,50 €. Zahlung oder Einspruch innerhalb von 2 Wochen ab Zustelldatum.',
      warnung:
        'Nach Fristablauf: Mahnung + 28,50 € Verwaltungsgebühr. Einspruch bis zum Fristdatum möglich.',
      betrag: 48.50, waehrung: '€',
      frist: d(5), datum: d(-3),
      risiko: 'hoch',
      aktionen: ['zahlen', 'einspruch', 'kalender'],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-vodafone-rechnung',
      isDemo: true,
      titel: 'Vodafone — Monatliche Rechnung',
      typ: 'Rechnungen',
      absender: 'Vodafone GmbH',
      zusammenfassung:
        'Monatliche Rechnung 42,90 €. SEPA-Lastschrift am 14. Mai 2026 vom hinterlegten Konto.',
      warnung: null,
      betrag: 42.90, waehrung: '€',
      frist: d(13), datum: d(-7),
      risiko: 'niedrig',
      aktionen: ['zahlen'],
      gelesen: true, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-ard-mahnung',
      isDemo: true,
      titel: 'Mahnung — Rundfunkbeitrag',
      typ: 'Mahnung / Zahlungserinnerung',
      absender: 'ARD ZDF Deutschlandradio Beitragsservice',
      zusammenfassung:
        'Rückstand Q1 2026: 18,36 €. Letzte Mahnung vor Einleitung des Vollstreckungsverfahrens.',
      warnung:
        'Vollstreckungsverfahren + bis zu 100 € Verwaltungsgebühren bei weiterer Nichtzahlung.',
      betrag: 18.36, waehrung: '€',
      frist: d(6), datum: d(-1),
      risiko: 'mittel',
      aktionen: ['zahlen', 'kalender'],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-steuerbescheid',
      isDemo: true,
      titel: 'Einkommensteuerbescheid 2023',
      typ: 'Steuer',
      absender: 'Finanzamt Köln-Mitte',
      zusammenfassung:
        'Einkommensteuerbescheid 2023. Nachzahlung 126,20 €. Fällig am 18. Mai 2026. Einspruchsfrist: 1 Monat ab Zustellung.',
      warnung:
        'Säumniszuschläge ab Fälligkeitstag (1 % pro Monat des rückständigen Betrags).',
      betrag: 126.20, waehrung: '€',
      frist: d(17), datum: d(-5),
      risiko: 'hoch',
      aktionen: ['zahlen', 'einspruch', 'kalender'],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-versicherung',
      isDemo: true,
      titel: 'Kfz-Versicherung — Beitragserhöhung',
      typ: 'Versicherung',
      absender: 'HUK-COBURG Versicherung AG',
      zusammenfassung:
        'Beitragsanpassung ab 01.07.2026: +18,40 € monatlich. Sonderkündigungsrecht bis 30 Tage nach Zugang.',
      warnung:
        'Sonderkündigungsrecht besteht — fristgerechte Kündigung spart 220 € / Jahr.',
      betrag: 18.40, waehrung: '€',
      frist: d(25), datum: d(-2),
      risiko: 'mittel',
      aktionen: ['einspruch', 'kalender'],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-termin-buergeramt',
      isDemo: true,
      titel: 'Terminbestätigung — Bürgeramt Berlin',
      typ: 'Termin',
      absender: 'Bürgeramt Berlin-Mitte',
      zusammenfassung:
        'Termin am 12. Mai 2026, 10:00 Uhr. Bürgeramt Mitte, Musterstraße 1. Bitte Personalausweis und Meldebescheinigung mitbringen.',
      warnung: 'Termin verfällt bei Nichtteilnahme. Wartezeit für neuen Termin: ca. 6–8 Wochen.',
      betrag: null, waehrung: '€',
      frist: d(11), datum: d(-2),
      risiko: 'niedrig',
      aktionen: ['kalender'],
      gelesen: true, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-vertrag',
      isDemo: true,
      titel: 'Stromvertrag — Preisanpassung',
      typ: 'Verträge',
      absender: 'Muster Energie GmbH',
      zusammenfassung:
        'Preisanpassung ab 01.08.2026. Sonderkündigungsrecht bis 30. Juni 2026. Kündigung per E-Mail oder Brief möglich.',
      warnung:
        'Ohne Kündigung verlängert sich der Vertrag automatisch um 12 Monate.',
      betrag: null, waehrung: '€',
      frist: d(30), datum: d(-10),
      risiko: 'mittel',
      aktionen: ['einspruch', 'kalender'],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
    // ── Reply Assistant smoke-test entries (dev/demo only) ───────────────────
    {
      id: 'demo-reply-bussgeld',
      isDemo: true,
      titel: 'Bußgeldbescheid — Staufen 12.05.2026',
      typ: 'Bußgeld',
      absender: 'Landratsamt Breisgau-Hochschwarzwald',
      zusammenfassung:
        'Geschwindigkeitsüberschreitung 23.04.2026, B317. Bußgeld: 80 €. Einspruch innerhalb von 2 Wochen.',
      warnung: 'Einspruchsfrist: 2 Wochen ab Zustellung.',
      betrag: 80, waehrung: '€',
      frist: d(8), datum: d(-4),
      risiko: 'hoch',
      aktionen: ['zahlen', 'einspruch', 'kalender'],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-reply-jobcenter',
      isDemo: true,
      titel: 'Jobcenter — Aufforderung zur Unterlagenvorlage',
      typ: 'Jobcenter',
      absender: 'Jobcenter Freiburg',
      zusammenfassung:
        'Vorlage fehlender Unterlagen bis 20.05.2026. Fehlend: Kontoauszüge Quartal 1/2026, Mietnachweis.',
      warnung: 'Bei Nichtvorlage kann die Leistung vorläufig eingestellt werden.',
      betrag: null, waehrung: '€',
      frist: d(12), datum: d(-2),
      risiko: 'hoch',
      aktionen: ['einspruch', 'kalender'],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-reply-miete',
      isDemo: true,
      titel: 'Vermieter — Nebenkostenabrechnung 2025',
      typ: 'Miete',
      absender: 'Hausverwaltung Schwarzwald GmbH',
      zusammenfassung:
        'Nebenkostenabrechnung 2025: Nachzahlung 312,40 €. Fällig am 30.05.2026. Belegprüfung möglich.',
      warnung: 'Einspruchsfrist für Belegeinsicht: 12 Monate ab Zugang der Abrechnung.',
      betrag: 312.40, waehrung: '€',
      frist: d(20), datum: d(-10),
      risiko: 'mittel',
      aktionen: ['zahlen', 'einspruch', 'kalender'],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-reply-schufa',
      isDemo: true,
      titel: 'Schufa — Datenkopie anfordern',
      typ: 'Schufa',
      absender: 'Schufa Holding AG',
      zusammenfassung:
        'Jährliche Eigenauskunft / Datenkopie nach Art. 15 DSGVO. Kostenlose Übersicht einmal jährlich.',
      warnung: null,
      betrag: null, waehrung: '€',
      frist: null, datum: d(-1),
      risiko: 'niedrig',
      aktionen: [],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-reply-inkasso-default',
      isDemo: true,
      titel: 'Inkasso — Forderungsschreiben (kein Nachweis)',
      typ: 'Inkasso',
      absender: 'Creditreform Boniversum GmbH',
      zusammenfassung:
        'Forderung 249,90 € aus Rechnung 2025. Zahlung bis 15.05.2026 oder Einleitung gerichtlicher Schritte.',
      warnung:
        'Kein Zahlungsnachweis vorhanden. Default-Kandidatenliste leer — erwartetes Verhalten.',
      betrag: 249.90, waehrung: '€',
      frist: d(7), datum: d(-3),
      risiko: 'hoch',
      aktionen: ['zahlen', 'einspruch'],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
    {
      id: 'demo-reply-inkasso-zahlung',
      isDemo: true,
      titel: 'Inkasso — Zahlung bereits erfolgt (Nachweis)',
      typ: 'Inkasso — Zahlungsnachweis',
      absender: 'EOS Inkasso GmbH',
      zusammenfassung:
        'Zahlung wurde am 02.05.2026 geleistet. Überweisungsbeleg liegt vor. Bestätigung der Erledigung ausstehend.',
      warnung:
        'Inkasso hat Zahlung noch nicht bestätigt. Zahlungsnachweis sollte übermittelt werden.',
      betrag: 0, waehrung: '€',
      frist: null, datum: d(-5),
      risiko: 'niedrig',
      aktionen: [],
      gelesen: false, erledigt: false, uri: null, rohText: null,
    },
  ];
}

export const DEMO_DOKUMENTE = createDemoDokumente();
