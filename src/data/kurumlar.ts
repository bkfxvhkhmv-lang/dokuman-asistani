export interface KategoriItem {
  id: string;
  label: string;
  icon: string;
}

export interface KurumItem {
  id: string;
  kategori: string;
  ad: string;
  altAd: string | null;
  icon: string;
  renk: string;
  aciklama: string;
  tipikBelgeler: string[];
  neYapilir: string;
  webseite?: string;
  telefon?: string;
  onemliNot: string | null;
}

export const KATEGORILER: KategoriItem[] = [
  { id: 'tumu',         label: 'Alle',        icon: '🔍' },
  { id: 'behörde',      label: 'Behörden',    icon: '🏛️' },
  { id: 'finanzen',     label: 'Finanzen',    icon: '💰' },
  { id: 'sozial',       label: 'Soziales',    icon: '🤝' },
  { id: 'gesundheit',   label: 'Gesundheit',  icon: '🏥' },
  { id: 'wohnen',       label: 'Wohnen',      icon: '🏠' },
  { id: 'arbeit',       label: 'Arbeit',      icon: '💼' },
  { id: 'justiz',       label: 'Justiz',      icon: '' },
  { id: 'bildung',      label: 'Bildung',     icon: '🎓' },
  { id: 'versicherung', label: 'Versicherung', icon: '️' },
];

export const KURUMLAR: KurumItem[] = [
  // ── Behörden ──────────────────────────────────────────────────────────────
  {
    id: 'einwohnermeldeamt', kategori: 'behörde', ad: 'Einwohnermeldeamt',
    altAd: 'Bürgerbüro / Bürgeramt', icon: '🏛️', renk: '#534AB7',
    aciklama: 'An- und Abmeldung des Wohnsitzes, Ausweise, Führerschein, Ummeldung.',
    tipikBelgeler: ['Anmeldebescheinigung', 'Abmeldebescheinigung', 'Meldebestätigung'],
    neYapilir: 'Wohnsitz ummelden innerhalb von 14 Tagen nach Umzug. Personalausweis und Wohnungsgeberbestätigung mitbringen.',
    webseite: 'buergerbüro.de', telefon: '115',
    onemliNot: 'Ummeldung: spätestens 14 Tage nach Umzug — sonst Bußgeld bis 1.000 €',
  },
  {
    id: 'auslaenderbehoerde', kategori: 'behörde', ad: 'Ausländerbehörde',
    altAd: 'ABH / Ausländeramt', icon: '🛂', renk: '#534AB7',
    aciklama: 'Aufenthaltserlaubnis, Niederlassungserlaubnis, Visum, Einbürgerung.',
    tipikBelgeler: ['Aufenthaltstitel', 'Bescheinigung über Aufenthaltsgestattung', 'Duldung', 'Visumsantrag'],
    neYapilir: 'Rechtzeitig vor Ablauf des Aufenthaltstitels Termin buchen. Alle Unterlagen vollständig mitbringen.',
    telefon: 'Stadtbüro',
    onemliNot: 'Aufenthaltstitel rechtzeitig verlängern — mindestens 6–8 Wochen vor Ablauf Termin vereinbaren!',
  },
  {
    id: 'standesamt', kategori: 'behörde', ad: 'Standesamt',
    altAd: null, icon: '💍', renk: '#9B59B6',
    aciklama: 'Heirat, Scheidung, Geburt, Sterbefälle, Namensänderung, Urkunden.',
    tipikBelgeler: ['Geburtsurkunde', 'Heiratsurkunde', 'Sterbeurkunde'],
    neYapilir: 'Für Heirat: frühzeitig anmelden (3–6 Monate vorher). Für Geburt: innerhalb von 7 Tagen anzeigen.',
    onemliNot: null,
  },
  {
    id: 'kfz', kategori: 'behörde', ad: 'Kfz-Zulassungsstelle',
    altAd: 'Straßenverkehrsamt', icon: '🚗', renk: '#2980B9',
    aciklama: 'Fahrzeugzulassung, Abmeldung, Kennzeichen, Führerschein.',
    tipikBelgeler: ['Fahrzeugschein', 'Fahrzeugbrief', 'Zulassungsbescheinigung'],
    neYapilir: 'Fahrzeug innerhalb von 10 Tagen nach Kauf ummelden. eVB-Nummer (Versicherung) bereithalten.',
    onemliNot: 'Ohne gültige Kfz-Versicherung keine Zulassung möglich.',
  },
  {
    id: 'amtsgericht', kategori: 'justiz', ad: 'Amtsgericht',
    altAd: null, icon: '', renk: '#E74C3C',
    aciklama: 'Handelsregister, Grundbuch, Insolvenzverfahren, Mahnbescheid, Strafverfahren.',
    tipikBelgeler: ['Mahnbescheid', 'Vollstreckungsbescheid', 'Insolvenzantrag', 'Urteil'],
    neYapilir: 'Mahnbescheid: innerhalb von 2 Wochen Widerspruch einlegen. Anwaltspflicht ab 5.000 € Streitwert.',
    onemliNot: 'Widerspruchsfrist beim Mahnbescheid: 14 Tage — danach Vollstreckungsbescheid!',
  },
  {
    id: 'verwaltungsgericht', kategori: 'justiz', ad: 'Verwaltungsgericht',
    altAd: 'VG', icon: '🏛️', renk: '#E74C3C',
    aciklama: 'Klage gegen Behördenbescheide, Asylrecht, öffentliches Recht.',
    tipikBelgeler: ['Klage', 'Widerspruchsbescheid', 'Urteil'],
    neYapilir: 'Klage innerhalb von 1 Monat nach Widerspruchsbescheid einreichen. Anwaltspflicht empfohlen.',
    onemliNot: 'Klagefrist: 1 Monat nach Zustellung des Widerspruchsbescheids.',
  },

  // ── Finanzen ──────────────────────────────────────────────────────────────
  {
    id: 'finanzamt', kategori: 'finanzen', ad: 'Finanzamt',
    altAd: 'FA', icon: '💰', renk: '#27AE60',
    aciklama: 'Steuererklärung, Steuerbescheid, USt-IdNr., Lohnsteuer, Einkommensteuer.',
    tipikBelgeler: ['Einkommensteuerbescheid', 'Umsatzsteuerbescheid', 'Mahnbescheid Finanzamt', 'Steuervorauszahlung'],
    neYapilir: 'Steuererklärung: bis 31. Juli des Folgejahres (mit Steuerberater: bis Feb). Widerspruch: 1 Monat.',
    webseite: 'elster.de',
    onemliNot: 'Einspruchsfrist gegen Steuerbescheid: 1 Monat nach Zustellung (§ 355 AO)',
  },
  {
    id: 'zoll', kategori: 'finanzen', ad: 'Zollamt',
    altAd: 'Hauptzollamt', icon: '📦', renk: '#27AE60',
    aciklama: 'Einfuhr, Ausfuhr, Zollabgaben, Schwarzarbeitkontrolle, Kraftfahrzeugsteuer.',
    tipikBelgeler: ['Zollbescheid', 'Einfuhrabgabenbescheid'],
    neYapilir: 'Waren bei Import korrekt deklarieren. Einspruch gegen Zollbescheid: 1 Monat.',
    onemliNot: null,
  },
  {
    id: 'inkasso', kategori: 'finanzen', ad: 'Inkassobüro',
    altAd: null, icon: '⚠️', renk: '#E74C3C',
    aciklama: 'Forderungseinzug für Gläubiger. Oft überhöhte Gebühren — Vorsicht!',
    tipikBelgeler: ['Mahnschreiben', 'Inkassoschreiben', 'Forderungsaufstellung'],
    neYapilir: 'Forderung schriftlich prüfen lassen. Unverhältnismäßige Inkassogebühren anfechten. Verbraucherzentrale kontaktieren.',
    onemliNot: 'Inkasso-Gebühren sind gesetzlich begrenzt (RDG). Nicht ohne Prüfung zahlen!',
  },
  {
    id: 'gerichtsvollzieher', kategori: 'finanzen', ad: 'Gerichtsvollzieher',
    altAd: 'GV', icon: '🔨', renk: '#E74C3C',
    aciklama: 'Vollstreckung von Urteilen und Titeln, Pfändung, Zwangsvollstreckung.',
    tipikBelgeler: ['Pfändungs- und Überweisungsbeschluss', 'Vollstreckungsauftrag'],
    neYapilir: 'Bei Pfändung: sofort Rechtsanwalt kontaktieren. Pfändungsschutzkonto (P-Konto) bei der Bank einrichten.',
    onemliNot: 'P-Konto einrichten — schützt Existenzminimum vor Pfändung!',
  },

  // ── Soziales ──────────────────────────────────────────────────────────────
  {
    id: 'jobcenter', kategori: 'sozial', ad: 'Jobcenter',
    altAd: 'Agentur für Arbeit', icon: '💼', renk: '#3498DB',
    aciklama: 'Bürgergeld (ALG II), Arbeitslosengeld I, Vermittlung, Weiterbildung.',
    tipikBelgeler: ['Bewilligungsbescheid', 'Ablehnungsbescheid', 'Eingliederungsvereinbarung', 'Sanktionsbescheid'],
    neYapilir: 'ALG I: innerhalb von 3 Tagen nach Kündigung melden. Gegen Sanktionen: 1 Monat Widerspruchsfrist.',
    webseite: 'arbeitsagentur.de',
    onemliNot: 'Arbeitslosigkeit sofort melden — jeder Tag Verspätung kann zur Sperrzeit führen!',
  },
  {
    id: 'sozialamt', kategori: 'sozial', ad: 'Sozialamt',
    altAd: null, icon: '🤝', renk: '#3498DB',
    aciklama: 'Sozialhilfe, Grundsicherung, Wohngeld, Eingliederungshilfe.',
    tipikBelgeler: ['Bewilligungsbescheid Sozialhilfe', 'Wohngeldbescheid', 'Ablehnungsbescheid'],
    neYapilir: 'Antrag stellen und alle Einkommens- und Vermögensnachweise beifügen. Widerspruch: 1 Monat.',
    onemliNot: null,
  },
  {
    id: 'jugendamt', kategori: 'sozial', ad: 'Jugendamt',
    altAd: null, icon: '👨‍👩‍👧', renk: '#9B59B6',
    aciklama: 'Kindergeld, Unterhaltsvorschuss, Beistandschaft, Pflegeeltern, Kitaplatz.',
    tipikBelgeler: ['Kindergeldbescheid', 'Unterhaltsvorschussbescheid'],
    neYapilir: 'Kindergeld bei Familienkasse beantragen. Unterhaltsvorschuss beim Jugendamt, wenn Unterhalt nicht gezahlt wird.',
    onemliNot: null,
  },
  {
    id: 'versorgungsamt', kategori: 'sozial', ad: 'Versorgungsamt',
    altAd: null, icon: '♿', renk: '#16A085',
    aciklama: 'Schwerbehindertenausweis, GdB-Feststellung, Merkzeichen, Nachteilsausgleich.',
    tipikBelgeler: ['Feststellungsbescheid GdB', 'Schwerbehindertenausweis'],
    neYapilir: 'Antrag auf Feststellung einer Behinderung mit ärztlichen Gutachten einreichen. Widerspruch: 1 Monat.',
    onemliNot: 'Ab GdB 50: Schwerbehindertenausweis — viele steuerliche Vorteile!',
  },
  {
    id: 'rentenversicherung', kategori: 'sozial', ad: 'Deutsche Rentenversicherung',
    altAd: 'DRV', icon: '👴', renk: '#2C3E50',
    aciklama: 'Rente, Renteninformation, Reha, Erwerbsminderungsrente.',
    tipikBelgeler: ['Rentenbescheid', 'Ablehnungsbescheid', 'Rentenauskunft'],
    neYapilir: 'Rentenantrag 3 Monate vor Renteneintritt stellen. Gegen Rentenbescheid: 1 Monat Widerspruchsfrist.',
    webseite: 'deutscherentenversicherung.de',
    onemliNot: null,
  },

  // ── Bildung ────────────────────────────────────────────────────────────────
  {
    id: 'bafög', kategori: 'bildung', ad: 'BAföG-Amt',
    altAd: 'Studentenwerk', icon: '🎓', renk: '#8E44AD',
    aciklama: 'Ausbildungsförderung, Studienfinanzierung BAföG.',
    tipikBelgeler: ['BAföG-Bescheid', 'Ablehnungsbescheid', 'Rückforderungsbescheid'],
    neYapilir: 'Antrag online stellen (bafoeg-digital.de). Bei Ablehnung: Widerspruch einlegen.',
    webseite: 'bafoeg-digital.de',
    onemliNot: 'BAföG-Bescheide immer aufbewahren — Rückforderungen können nach Jahren kommen!',
  },

  // ── Gesundheit ────────────────────────────────────────────────────────────
  {
    id: 'krankenkasse', kategori: 'gesundheit', ad: 'Krankenkasse',
    altAd: 'GKV / AOK / TK / DAK / Barmer', icon: '🏥', renk: '#E74C3C',
    aciklama: 'Krankenversicherung, Krankengeld, Leistungsanträge, Zuzahlungsbefreiung.',
    tipikBelgeler: ['Leistungsbescheid', 'Ablehnungsbescheid', 'Widerspruchsbescheid', 'Krankengeldbescheid'],
    neYapilir: 'Leistungsablehnung: Widerspruch innerhalb 1 Monat. Bei komplexen Fällen: unabhängige Patientenberatung.',
    webseite: 'gkv.de',
    onemliNot: 'Krankengeld: ab 6. Woche Krankheit — sofort beim Arzt Folgebescheinigung holen!',
  },
  {
    id: 'pflegekasse', kategori: 'gesundheit', ad: 'Pflegekasse',
    altAd: null, icon: '👴', renk: '#E67E22',
    aciklama: 'Pflegegrad, Pflegegeld, Pflegesachleistungen, Kurzzeitpflege.',
    tipikBelgeler: ['Pflegegradgutachten', 'Pflegegeldbescheid', 'Ablehnungsbescheid Pflegegrad'],
    neYapilir: 'Pflegegrad beantragen. MDK kommt zur Begutachtung. Niedrigen Pflegegrad: Widerspruch mit Arztberichten.',
    onemliNot: 'Widerspruch gegen Pflegegrad-Entscheidung: 1 Monat — Arztgutachten mitliefern!',
  },

  // ── Wohnen ────────────────────────────────────────────────────────────────
  {
    id: 'wohnungsamt', kategori: 'wohnen', ad: 'Wohnungsamt',
    altAd: null, icon: '🏠', renk: '#D35400',
    aciklama: 'Wohnberechtigungsschein (WBS), Sozialwohnungen, Wohngeld.',
    tipikBelgeler: ['Wohnberechtigungsschein', 'Wohngeldbescheid'],
    neYapilir: 'WBS beantragen mit Einkommensnachweisen. Wohngeld beim Wohnungsamt oder online beantragen.',
    onemliNot: null,
  },
  {
    id: 'hausverwaltung', kategori: 'wohnen', ad: 'Hausverwaltung',
    altAd: null, icon: '🔑', renk: '#D35400',
    aciklama: 'Nebenkostenabrechnung, Mängelbeseitigung, Mieterhöhung.',
    tipikBelgeler: ['Nebenkostenabrechnung', 'Mieterhöhungsschreiben', 'Kündigung'],
    neYapilir: 'Nebenkostenabrechnung: Einwände innerhalb 12 Monate. Mieterhöhung: mindestens 2 Monate Bedenkzeit.',
    onemliNot: 'Mieterhöhung: Max. 20% in 3 Jahren (Kappungsgrenze). Mieterverein beitreten!',
  },
  {
    id: 'mieterverein', kategori: 'wohnen', ad: 'Mieterverein / Mieterschutzbund',
    altAd: null, icon: '🏘️', renk: '#27AE60',
    aciklama: 'Mieterrechtsberatung, Unterstützung bei Mietstreitigkeiten, Kündigung.',
    tipikBelgeler: ['Mietvertrag', 'Kündigung', 'Mieterhöhung'],
    neYapilir: 'Mitgliedschaft lohnt sich bei Mietstreitigkeiten. Erste Beratung oft kostenlos.',
    onemliNot: null,
  },

  // ── Arbeit ────────────────────────────────────────────────────────────────
  {
    id: 'arbeitsamt', kategori: 'arbeit', ad: 'Agentur für Arbeit',
    altAd: null, icon: '💼', renk: '#3498DB',
    aciklama: 'ALG I, Berufsberatung, Weiterbildungsförderung, Kurzarbeit.',
    tipikBelgeler: ['ALG-Bescheid', 'Sperrzeitbescheid', 'Bildungsgutschein'],
    neYapilir: 'Sofort nach Kenntnis der Kündigung melden (spätestens 3 Monate vorher). ALG I = 60–67% des Nettogehalts.',
    webseite: 'arbeitsagentur.de',
    onemliNot: 'Verspätete Meldung = Sperrzeit! Sofort nach Kündigung Termin buchen.',
  },
  {
    id: 'gewerbeamt', kategori: 'arbeit', ad: 'Gewerbeamt',
    altAd: null, icon: '🏪', renk: '#8E44AD',
    aciklama: 'Gewerbeanmeldung, -ummeldung, -abmeldung.',
    tipikBelgeler: ['Gewerbeschein', 'Gewerbeanmeldung'],
    neYapilir: 'Gewerbe innerhalb 4 Wochen nach Aufnahme anmelden. Kosten: ca. 20–60 €.',
    onemliNot: null,
  },

  // ── Versicherungen ────────────────────────────────────────────────────────
  {
    id: 'haftpflicht', kategori: 'versicherung', ad: 'Haftpflichtversicherung',
    altAd: null, icon: '️', renk: '#16A085',
    aciklama: 'Schäden, die man Dritten zufügt. Wichtigste Privatversicherung.',
    tipikBelgeler: ['Police', 'Schadensregulierung', 'Kündigung'],
    neYapilir: 'Schaden sofort melden. Kündigung: 3 Monate vor Ablauf oder nach Schadensfall.',
    onemliNot: 'Ohne Haftpflicht kann ein Schaden existenzgefährdend werden!',
  },
  {
    id: 'kfzversicherung', kategori: 'versicherung', ad: 'Kfz-Versicherung',
    altAd: null, icon: '🚗', renk: '#2980B9',
    aciklama: 'Pflichtversicherung für Fahrzeuge. Haftpflicht, Teilkasko, Vollkasko.',
    tipikBelgeler: ['eVB-Nummer', 'Schadensanzeige', 'Police', 'Kündigung'],
    neYapilir: 'Kündigung bis 30. November für Jahresende. Schaden innerhalb 7 Tage melden.',
    onemliNot: 'Kündigung Stichtag: 30. November (per Einschreiben)!',
  },
];
