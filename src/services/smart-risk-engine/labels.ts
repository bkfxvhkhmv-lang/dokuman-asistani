import type { RiskLevel, RiskTrend } from './types';

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return 'kritisch';
  if (score >= 60) return 'hoch';
  if (score >= 35) return 'mittel';
  if (score >= 10) return 'niedrig';
  return 'kein';
}

export const LEVEL_LABELS: Record<RiskLevel, string> = {
  kritisch: 'Kritisch — sofort handeln',
  hoch:     'Hoch — diese Woche handeln',
  mittel:   'Mittel — bald prüfen',
  niedrig:  'Niedrig — im Blick behalten',
  kein:     'Kein Risiko',
};

export const TREND_LABELS: Record<RiskTrend, string> = {
  verschlechtert: '↑ Risiko steigt',
  stabil:         '→ Stabil',
  verbessert:     '↓ Risiko sinkt',
};
