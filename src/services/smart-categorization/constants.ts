/** Tür, kurum ve anahtar kelime tabloları — Smart Categorization.
 */

export const SUB_CATEGORIES: Record<string, string[]> = {
  Rechnung:         ['Strom/Gas', 'Wasser', 'Miete/Nebenkosten', 'Telefon/Internet', 'Versicherung', 'Handwerk/Reparatur', 'Einkauf', 'Abonnement', 'Sonstige Rechnung'],
  Mahnung:          ['1. Mahnung', '2. Mahnung', '3. Mahnung / Letzte Mahnung', 'Inkasso-Mahnung'],
  Bußgeld:          ['Verkehrsdelikt', 'Parkvergehen', 'Ordnungsamt', 'Sonstiges Bußgeld'],
  Steuerbescheid:   ['Einkommensteuer', 'Umsatzsteuer', 'Körperschaftsteuer', 'Gewerbesteuer', 'Grundsteuer', 'Sonstiger Steuerbescheid'],
  Kündigung:        ['Mietvertrag', 'Arbeitsvertrag', 'Versicherung', 'Mobilfunkvertrag', 'Sonstige Kündigung'],
  Termin:           ['Behörden-Termin', 'Arzt-Termin', 'Gericht-Termin', 'Sonstiger Termin'],
  Versicherung:     ['Krankenversicherung', 'Kfz-Versicherung', 'Haftpflicht', 'Hausrat', 'Lebensversicherung', 'Sonstige Versicherung'],
  Vertrag:          ['Mietvertrag', 'Arbeitsvertrag', 'Mobilfunk', 'Internet', 'Strom/Gas', 'Sonstiger Vertrag'],
  Behördenbescheid: ['Ausländerbehörde', 'Finanzamt', 'Sozialamt', 'Jobcenter', 'Krankenamt', 'Sonstiger Bescheid'],
  Sonstiges:        [],
};

// ── Institution database ───────────────────────────────────────────────────────

export const INSTITUTION_DB: {
  pattern: RegExp;
  name: string;
  typ: string;
  subtyp: string | null;
  icon: string;
  land: string;
}[] = [
  // Behörden
  { pattern: /finanzamt/i,              name: 'Finanzamt',             typ: 'Steuerbescheid',   subtyp: 'Einkommensteuer',    icon: '🏛', land: 'DE' },
  { pattern: /kreisjugendamt/i,         name: 'Kreisjugendamt',        typ: 'Behördenbescheid', subtyp: null,                 icon: '🏛', land: 'DE' },
  { pattern: /kreissozialamt/i,         name: 'Kreissozialamt',        typ: 'Behördenbescheid', subtyp: null,                 icon: '🏛', land: 'DE' },
  { pattern: /landratsamt/i,            name: 'Landratsamt',           typ: 'Behördenbescheid', subtyp: null,                 icon: '🏛', land: 'DE' },
  { pattern: /landkreis/i,              name: 'Landkreis',             typ: 'Behördenbescheid', subtyp: null,                 icon: '🏛', land: 'DE' },
  { pattern: /ausländer(?:behörde|amt)/i,name: 'Ausländerbehörde',    typ: 'Behördenbescheid', subtyp: 'Ausländerbehörde',   icon: '🏛', land: 'DE' },
  { pattern: /jobcenter/i,              name: 'Jobcenter',             typ: 'Behördenbescheid', subtyp: 'Jobcenter',          icon: '🏛', land: 'DE' },
  { pattern: /agentur\s+f[uü]r\s+arbeit/i, name: 'Agentur für Arbeit', typ: 'Behördenbescheid', subtyp: null,               icon: '🏛', land: 'DE' },
  { pattern: /sozialamt/i,              name: 'Sozialamt',             typ: 'Behördenbescheid', subtyp: 'Sozialamt',          icon: '🏛', land: 'DE' },
  { pattern: /ordnungsamt/i,            name: 'Ordnungsamt',           typ: 'Bußgeld',          subtyp: 'Ordnungsamt',        icon: '🚔', land: 'DE' },
  { pattern: /bußgeldstelle/i,          name: 'Bußgeldstelle',         typ: 'Bußgeld',          subtyp: 'Verkehrsdelikt',     icon: '🚔', land: 'DE' },
  // Krankenkassen (specific before generic kranken*)
  { pattern: /techniker\s+krankenkasse/i, name: 'Techniker Krankenkasse', typ: 'Behördenbescheid', subtyp: 'Krankenamt',    icon: '🏥', land: 'DE' },
  { pattern: /barmer/i,                 name: 'Barmer',                typ: 'Behördenbescheid', subtyp: 'Krankenamt',         icon: '🏥', land: 'DE' },
  { pattern: /dak.gesundheit|\bdak\b/i, name: 'DAK',                   typ: 'Behördenbescheid', subtyp: 'Krankenamt',         icon: '🏥', land: 'DE' },
  { pattern: /\baok\b/i,                name: 'AOK',                   typ: 'Behördenbescheid', subtyp: 'Krankenamt',         icon: '🏥', land: 'DE' },
  { pattern: /kranken(?:kasse|amt)/i,   name: 'Krankenkasse',          typ: 'Behördenbescheid', subtyp: 'Krankenamt',         icon: '🏥', land: 'DE' },
  // Telecom
  { pattern: /vodafone/i,               name: 'Vodafone',              typ: 'Rechnung',         subtyp: 'Telefon/Internet',   icon: '📱', land: 'DE' },
  { pattern: /telekom|deutsche telekom/i,name: 'Deutsche Telekom',    typ: 'Rechnung',         subtyp: 'Telefon/Internet',   icon: '📱', land: 'DE' },
  { pattern: /o2|telefónica/i,          name: 'O2',                    typ: 'Rechnung',         subtyp: 'Telefon/Internet',   icon: '📱', land: 'DE' },
  { pattern: /1&1|1und1/i,              name: '1&1',                   typ: 'Rechnung',         subtyp: 'Internet',           icon: '🌐', land: 'DE' },
  { pattern: /freenet/i,                name: 'Freenet',               typ: 'Rechnung',         subtyp: 'Telefon/Internet',   icon: '📱', land: 'DE' },
  // Energie
  { pattern: /eon\b|e\.on/i,            name: 'E.ON',                  typ: 'Rechnung',         subtyp: 'Strom/Gas',          icon: '⚡', land: 'DE' },
  { pattern: /rwe\b/i,                  name: 'RWE',                   typ: 'Rechnung',         subtyp: 'Strom/Gas',          icon: '⚡', land: 'DE' },
  { pattern: /stadtwerke/i,             name: 'Stadtwerke',            typ: 'Rechnung',         subtyp: 'Strom/Gas',          icon: '⚡', land: 'DE' },
  { pattern: /enBW/i,                   name: 'EnBW',                  typ: 'Rechnung',         subtyp: 'Strom/Gas',          icon: '⚡', land: 'DE' },
  { pattern: /vattenfall/i,             name: 'Vattenfall',            typ: 'Rechnung',         subtyp: 'Strom/Gas',          icon: '⚡', land: 'DE' },
  // Banken
  { pattern: /commerzbank/i,            name: 'Commerzbank',           typ: 'Rechnung',         subtyp: null,                 icon: '🏦', land: 'DE' },
  { pattern: /sparkasse/i,              name: 'Sparkasse',             typ: 'Rechnung',         subtyp: null,                 icon: '🏦', land: 'DE' },
  { pattern: /deutsche bank/i,          name: 'Deutsche Bank',         typ: 'Rechnung',         subtyp: null,                 icon: '🏦', land: 'DE' },
  { pattern: /postbank/i,               name: 'Postbank',              typ: 'Rechnung',         subtyp: null,                 icon: '🏦', land: 'DE' },
  { pattern: /volksbank|raiffeisen/i,   name: 'Volksbank',             typ: 'Rechnung',         subtyp: null,                 icon: '🏦', land: 'DE' },
  // Versicherungen
  { pattern: /allianz/i,                name: 'Allianz',               typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  { pattern: /\baxa\b/i,                name: 'AXA',                   typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  { pattern: /\bhuk.?24\b/i,            name: 'HUK24',                 typ: 'Versicherung',     subtyp: 'Kfz-Versicherung',   icon: '', land: 'DE' },
  { pattern: /huk.coburg/i,             name: 'HUK-COBURG',            typ: 'Versicherung',     subtyp: 'Kfz-Versicherung',   icon: '', land: 'DE' },
  { pattern: /online.versicherung/i,    name: 'HUK24',                 typ: 'Versicherung',     subtyp: 'Kfz-Versicherung',   icon: '', land: 'DE' },
  { pattern: /generali/i,               name: 'Generali',              typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  { pattern: /ergo\b/i,                 name: 'ERGO',                  typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  { pattern: /r\+v|r und v/i,           name: 'R+V',                   typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  { pattern: /zurich\b/i,               name: 'Zurich',                typ: 'Versicherung',     subtyp: null,                 icon: '', land: 'DE' },
  // Streaming/Abo
  { pattern: /netflix/i,                name: 'Netflix',               typ: 'Rechnung',         subtyp: 'Abonnement',         icon: '📺', land: 'INT' },
  { pattern: /spotify/i,                name: 'Spotify',               typ: 'Rechnung',         subtyp: 'Abonnement',         icon: '🎵', land: 'INT' },
  { pattern: /amazon\s*(prime|aws)?/i,  name: 'Amazon',                typ: 'Rechnung',         subtyp: 'Abonnement',         icon: '📦', land: 'INT' },
  // Inkasso
  { pattern: /inkasso|collection/i,     name: 'Inkasso',               typ: 'Mahnung',          subtyp: 'Inkasso-Mahnung',    icon: '⚠️', land: 'DE' },
  { pattern: /coeo\b|creditreform|intrum/i, name: 'Inkasso-Büro',      typ: 'Mahnung',          subtyp: 'Inkasso-Mahnung',    icon: '⚠️', land: 'DE' },
];

// ── Keyword scoring per type ───────────────────────────────────────────────────

export const TYPE_KEYWORDS: Record<string, { words: string[]; weight: number }[]> = {
  Rechnung: [
    { words: ['rechnung', 'rechnungsnr', 'rechnungsdatum'], weight: 25 },
    { words: ['mwst', 'mehrwertsteuer', 'ust'], weight: 20 },
    { words: ['gesamtbetrag', 'endbetrag', 'nettobetrag'], weight: 20 },
    { words: ['invoice', 'faktura'], weight: 15 },
    { words: ['fällig', 'zahlungsfrist'], weight: 10 },
  ],
  Mahnung: [
    { words: ['mahnung', 'zahlungserinnerung'], weight: 40 },
    { words: ['rückstand', 'säumnis', 'verzug'], weight: 25 },
    { words: ['letzte', 'endgültig', 'unverzüglich'], weight: 15 },
    { words: ['forderung', 'offener betrag'], weight: 10 },
  ],
  Bußgeld: [
    { words: ['bußgeld', 'bussgeldbescheid', 'ordnungswidrigkeit'], weight: 45 },
    { words: ['verwarnungsgeld', 'tatzeit', 'tatort'], weight: 30 },
    { words: ['einspruch', 'betroffene'], weight: 15 },
  ],
  Steuerbescheid: [
    { words: ['steuerbescheid', 'finanzamt'], weight: 40 },
    { words: ['einkommensteuer', 'körperschaftsteuer', 'umsatzsteuer'], weight: 30 },
    { words: ['steuer-id', 'steuernummer'], weight: 20 },
  ],
  Kündigung: [
    { words: ['kündigung', 'kündigt hiermit', 'gekündigt'], weight: 50 },
    { words: ['kündigungsfrist', 'vertragsende'], weight: 30 },
  ],
  Versicherung: [
    { words: ['versicherung', 'police', 'versicherungsnehmer'], weight: 40 },
    { words: ['versicherungsschein', 'versicherungssumme'], weight: 30 },
    { words: ['prämie', 'beitrag'], weight: 20 },
  ],
  Vertrag: [
    { words: ['vertrag', 'vertragspartner', 'vereinbarung'], weight: 35 },
    { words: ['laufzeit', 'mindestlaufzeit'], weight: 25 },
    { words: ['unterschrift', 'unterzeichnet'], weight: 20 },
  ],
  Behördenbescheid: [
    { words: ['bescheid', 'behörde', 'amt', 'verwaltung'], weight: 30 },
    { words: ['antrag', 'genehmigung', 'ablehnung'], weight: 25 },
    { words: ['rechtsmittel', 'widerspruch', 'klage'], weight: 20 },
  ],
  Termin: [
    { words: ['termin', 'vorladung', 'einladung'], weight: 40 },
    { words: ['erscheinen', 'persönlich'], weight: 20 },
  ],
};

/** Kullanıcıya gösterilen kategori ipuçları */
export const HATIRLATMA: Record<string, string | null> = {
  Rechnung:         'Zahlung bis zur Frist vorbereiten',
  Mahnung:          'Sofort handeln — Mahnkosten steigen schnell',
  Bußgeld:          '14 Tage Einspruchsfrist beachten',
  Steuerbescheid:   '1 Monat Einspruchsfrist (ab Bekanntgabe)',
  Kündigung:        'Kündigungsfristen und Rechte prüfen',
  Termin:           'Termin im Kalender eintragen',
  Versicherung:     'Jahresablauf und Kündigungsfristen notieren',
  Vertrag:          'Laufzeit und Kündigungsfristen prüfen',
  Behördenbescheid: 'Rechtsmittelfristen beachten',
  Sonstiges:        null,
};
