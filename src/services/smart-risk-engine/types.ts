import type { VertragRisiko, DarkPattern } from '@/utils';

export type RiskLevel = 'kritisch' | 'hoch' | 'mittel' | 'niedrig' | 'kein';
export type RiskTrend = 'verschlechtert' | 'stabil' | 'verbessert';

export interface RiskFactor {
  id: string;
  kategorie: 'frist' | 'betrag' | 'typ' | 'vollständigkeit' | 'dark_pattern' | 'rechtlich' | 'verhalten';
  beschreibung: string;
  gewicht: number;
  score: number;
  icon: string;
}

export interface RiskReduction {
  aktion: string;
  beschreibung: string;
  wirkung: string;
  dringlichkeit: 'sofort' | 'diese_woche' | 'bald';
  icon: string;
}

export interface PeerComparison {
  aehnlicheDokumente: number;
  durchschnittRisiko: string;
  istSchlechterAlsDurchschnitt: boolean;
  beschreibung: string;
}

export interface RiskEngineResult {
  gesamtScore: number;
  level: RiskLevel;
  levelLabel: string;
  trend: RiskTrend;
  trendLabel: string;
  faktoren: RiskFactor[];
  reduzierungsVorschlaege: RiskReduction[];
  darkPatterns: DarkPattern[];
  allgemeinRisiken: VertragRisiko[];
  peerComparison: PeerComparison | null;
  gesundheitsscore: number;
  erklaerung: string;
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
