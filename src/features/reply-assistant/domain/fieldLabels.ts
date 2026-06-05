const FIELD_LABELS: Record<string, string> = {
  aktenzeichen: 'Aktenzeichen',
  name: 'Name',
  adresse: 'Adresse',
  geburtsdatum: 'Geburtsdatum',
  geburtsort: 'Geburtsort',
  neue_frist: 'Neue Frist',
  steuernummer: 'Steuernummer',
  bescheid_datum: 'Bescheiddatum',
  bescheid_typ: 'Bescheidtyp',
  steuerart_jahr: 'Steuerart / Jahr',
  begruendung_frist: 'Begründung der Fristverlängerung',
  einspruch_begruendung: 'Begründung des Einspruchs',
  begruendung_finanzielle_lage: 'Begründung der finanziellen Lage',
  notlage_begruendung: 'Begründung der Notlage',
  datum: 'Datum',
  datum_schreiben: 'Datum des Schreibens',
  antrag_datum: 'Antragsdatum',
  antrag_typ: 'Antragsart',
  frist: 'Frist',
  fristdatum: 'Fristdatum',
  behebungs_frist: 'Frist zur Mängelbehebung',
  bg_nummer: 'BG-Nummer',
  unterlagen_liste: 'Liste der einzureichenden Unterlagen',
  unvollstaendige_punkte: 'Unvollständige Punkte',
  terminvorschlag: 'Terminvorschlag',
  monatliche_rate: 'Monatliche Rate (€)',
  erste_rate_datum: 'Datum der ersten Rate',
  offener_betrag: 'Offener Betrag (€)',
  spezifische_positionen: 'Zu prüfende Positionen',
  abrechnungs_datum: 'Abrechnungsdatum',
  abrechnungs_jahr: 'Abrechnungsjahr',
  abrechnungs_zeitraum: 'Abrechnungszeitraum',
  aenderungen_details: 'Details der Änderungen',
  mangel_beschreibung: 'Beschreibung der Mängel',
  mangel_anzeige_datum: 'Datum der Mängelanzeige',
  mangel_festgestellt_datum: 'Datum der Mängelfeststellung',
  mietwohnung_lage: 'Lage der Mietwohnung',
  vermieter_name: 'Name des Vermieters',
  vermieter_adresse: 'Adresse des Vermieters',
  hausverwaltung_name: 'Name der Hausverwaltung',
  hausverwaltung_adresse: 'Adresse der Hausverwaltung',
  vorige_adresse: 'Bisherige Adresse',
  inkasso_name: 'Name des Inkassobüros',
  inkasso_adresse: 'Adresse des Inkassobüros',
  konto_details: 'Kontodetails',
  zahlungs_nachweis_details: 'Details des Zahlungsnachweises',
  zeitraum_von: 'Zeitraum ab',
  email: 'E-Mail-Adresse',
  telefon: 'Telefonnummer',
  iban: 'IBAN',
  betrag: 'Betrag (€)',
  kundennummer: 'Kundennummer',
  vertragsnummer: 'Vertragsnummer',
};

function snakeCaseToTitle(key: string): string {
  return key
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? snakeCaseToTitle(key);
}
