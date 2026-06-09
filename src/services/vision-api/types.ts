export interface EntityBox {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'betrag' | 'frist' | 'iban' | 'aktenzeichen' | 'datum';
  text: string;
}

export interface VisionResult {
  text: string;
  confidence: number | null;
  entityBoxes: EntityBox[];
}

export interface DocumentAnalysis {
  typ: string;
  risiko: 'hoch' | 'mittel' | 'niedrig';
  betrag: number | null;
  frist: string | null;
  absender: string;
  aktionen: string[];
  zusammenfassung: string;
  kurzfassung: string;
  iban: string | null;
}
