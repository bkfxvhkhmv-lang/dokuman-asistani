export type FieldConfidence = 'hoch' | 'mittel' | 'niedrig' | 'fehlt';

export interface AutoFillField {
  key: keyof ExtractedFields;
  label: string;
  icon: string;
  wert: string | number | null;
  confidence: FieldConfidence;
  confidenceScore: number;
  quelle: string;
  editierbar: boolean;
  erforderlich: boolean;
}

export interface ExtractedFields {
  titel: string | null;
  typ: string;
  absender: string | null;
  betrag: number | null;
  frist: string | null;
  iban: string | null;
  aktenzeichen: string | null;
  kundennr: string | null;
  rechnungsnr: string | null;
  vertragsnr: string | null;
  zahlungszweck: string | null;
  steuerid: string | null;
  risiko: 'hoch' | 'mittel' | 'niedrig';
  aktionen: string[];
}

export interface AutoFillResult {
  fields: AutoFillField[];
  extracted: ExtractedFields;
  gesamtConfidence: number;
  fehlendePflichtfelder: string[];
  korrekturVorschlaege: KorrekturVorschlag[];
  verarbeitungsDauer: number;
}

export interface KorrekturVorschlag {
  feldKey: keyof ExtractedFields;
  grund: string;
  vorschlag: string | number | null;
}
