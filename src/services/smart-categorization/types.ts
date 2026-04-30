/** Smart Categorization — Tip tanımları */

export interface CategoryResult {
  typ: string;
  subtyp: string | null;
  confidence: number;
  alternatives: CategoryAlt[];
  signale: CategorySignal[];
  institution: InstitutionMatch | null;
  hatirlatma: string | null;
}

export interface CategoryAlt {
  typ: string;
  subtyp: string | null;
  score: number;
}

export interface CategorySignal {
  quelle: 'keyword' | 'institution_db' | 'betrag_pattern' | 'layout' | 'absender';
  beschreibung: string;
  gewicht: number;
}

export interface InstitutionMatch {
  name: string;
  typ: string;
  subtyp: string | null;
  icon: string;
  land: string;
  confidence: number;
}
