import type { Dokument } from '../store';
import type { RiskPalette, RiskEntry } from '../theme';

export type { RiskPalette, RiskEntry };

export interface FilterParams {
  risiko?: string;
  typ?: string;
  sortBy?: string;
  nurOffen?: boolean;
}

export interface SearchParams {
  query?: string;
  minBetrag?: string;
  maxBetrag?: string;
  vonDatum?: string;
  bisDatum?: string;
  typ?: string;
  risiko?: string;
  mitErledigt?: boolean;
}

export interface ParsedAbfrage {
  restQuery: string;
  minBetrag: string;
  maxBetrag: string;
  vonDatum: string;
  bisDatum: string;
  typ: string;
  risiko: string;
  ueberfaellig: boolean;
}

export interface TextDiffItem {
  wort: string;
  status: 'gleich' | 'entfernt' | 'hinzugefuegt';
}

export interface OcrRisikoItem {
  wort: string;
  risiko: 'hoch' | 'mittel';
  grund: string;
}

export interface RozetStats {
  gesamt: number;
  erledigt: number;
  dringend: number;
  offenBetrag: number;
  ungelesen: number;
}

export interface RozetDefinition {
  id: string;
  icon: string;
  label: string;
  beschreibung: string;
  check: (s: RozetStats) => boolean;
}

export type Rozet = RozetDefinition & { verdient: boolean };

export interface LernRegel {
  id: string;
  absenderPattern: string;
  felder: Partial<Pick<Dokument, 'typ' | 'risiko'>>;
  anwendungen: number;
  erstellt: string;
  label: string;
}

export interface LernVorschlag extends LernRegel {}

export interface LernRegelAnwendungResult {
  changes: Partial<Pick<Dokument, 'typ' | 'risiko'>>;
  regelId: string | null;
  regelLabel?: string;
}

export interface GraphNode {
  id: string;
  titel: string;
  typ: string;
  risiko: string | undefined;
  zentrum?: boolean;
  score?: number;
}

export interface GraphEdge {
  von: string;
  nach: string;
  gewicht: 'stark' | 'mittel' | 'schwach';
  grund: string;
}

export interface BeziehungsGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DokumentStats {
  gesamt: number;
  erledigt: number;
  offen: number;
  dringend: number;
  offenBetrag: number;
  topTypen: Array<{ typ: string; n: number }>;
}

export interface AufgabenVorschlag {
  id: string;
  titel: string;
  frist: string;
  prioritaet: 'hoch' | 'mittel' | 'niedrig';
  grund: string;
  icon: string;
}

export interface VertragRisiko {
  level: 'hoch' | 'mittel' | 'niedrig';
  icon: string;
  text: string;
}

export interface DarkPatternWarnung {
  id: string;
  schwere: 'hoch' | 'mittel' | 'niedrig';
  titel: string;
  beschreibung: string;
  rechtsgrundlage: string;
  empfehlung: string;
}

export interface DokumentErweitert extends Dokument {
  inkassoGebuehr?: number | string | null;
  zinsen?: number | string | null;
  schufaDrohung?: boolean;
  mahnungNummer?: string | number;
}

export interface OzetKarte {
  icon: string;
  titel: string;
  inhalt: string;
  aktion: string | null;
  aktionLabel: string | null;
}

export interface HatirlatmaVorschlag {
  tageVorher: number;
  datum: Date;
  label: string;
  datum_label: string;
  dringend: boolean;
}

export interface ErweiterteFeld {
  key: string;
  label: string;
  wert: string;
  icon: string;
  isDate?: boolean;
}

export interface OzetQuelle {
  ozetSatz: string;
  quelle: string | null;
  konfidenz: number;
}

export interface HatirlaticiSablon {
  id: string;
  icon: string;
  label: string;
  aySayisi: number;
  hinweis: string;
}

export interface SablonHatirlaticiResult {
  notifId: string;
  hedef: string;
}

export interface MonatsGruppe {
  monat: number;
  name: string;
  anzahl: number;
  gesamtBetrag: number;
  bezahlt: number;
  offen: number;
  risikoHoch: number;
}

export interface JahresOzetDokument extends Dokument {
  createdAt?: string;
  eingang?: string;
  bezahlt?: boolean;
  status?: string;
}

export interface JahresOzet {
  yil: number;
  gesamtAnzahl: number;
  gesamtBetrag: number;
  bezahlteBetraege: number;
  offeneBetraege: number;
  bezahlQuote: number;
  durchschnittBetrag: number;
  monatsGruppen: MonatsGruppe[];
  typVerteilung: Record<string, number>;
  risikoVerteilung: { hoch: number; mittel: number; niedrig: number };
  topAbsender: Array<{ ad: string; anzahl: number }>;
  geschaefstersMonat: MonatsGruppe;
}
