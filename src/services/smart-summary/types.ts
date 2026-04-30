export type SummaryMode = 'kurz' | 'mittel' | 'detailliert';

export interface SummaryResult {
  mode:           SummaryMode;
  kurzSatz:       string;
  kernPunkte:     string[];
  detailText:     string | null;
  risikoHinweise: string[];
  handlungsempfehlungen: string[];
  quelle:         'lokal' | 'ki_cloud' | 'ki_cache';
  verarbeitungMs: number;
}
