import type { VertragRisiko, DarkPattern } from '@/utils';

export type RiskLevel = 'kritisch' | 'hoch' | 'mittel' | 'niedrig' | 'kein';
export type RiskTrend = 'verschlechtert' | 'stabil' | 'verbessert';
export type TextParams = Record<string, string | number>;

export interface RiskFactor {
  id: string;
  kategorie: 'frist' | 'betrag' | 'typ' | 'vollständigkeit' | 'dark_pattern' | 'rechtlich' | 'verhalten';
  beschreibungKey: string;
  beschreibungParams?: TextParams;
  gewicht: number;
  score: number;
  icon: string;
}

export interface RiskReduction {
  aktion: string;
  beschreibungKey: string;
  beschreibungParams?: TextParams;
  wirkungKey: string;
  wirkungParams?: TextParams;
  dringlichkeit: 'sofort' | 'diese_woche' | 'bald';
  icon: string;
}

export interface PeerComparison {
  aehnlicheDokumente: number;
  durchschnittRisiko: string;
  istSchlechterAlsDurchschnitt: boolean;
  beschreibungKey: string;
  beschreibungParams?: TextParams;
}

export interface RiskEngineResult {
  gesamtScore: number;
  level: RiskLevel;
  levelLabelKey: string;
  trend: RiskTrend;
  trendLabelKey: string;
  faktoren: RiskFactor[];
  reduzierungsVorschlaege: RiskReduction[];
  darkPatterns: DarkPattern[];
  allgemeinRisiken: VertragRisiko[];
  peerComparison: PeerComparison | null;
  gesundheitsscore: number;
  erklaerungKey: string;
  erklaerungParams?: TextParams;
  isDataInsufficient: boolean;
}

export interface PortfolioRisk {
  gesamtScore: number;
  level: RiskLevel;
  kritischCount: number;
  hochCount: number;
  mittelCount: number;
  offenBetrag: number;
  topRisikoDokumente: { id: string; titel: string; score: number; level: RiskLevel }[];
}
