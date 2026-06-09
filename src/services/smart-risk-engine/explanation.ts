import type { Dokument } from '@/store';
import { getTageVerbleibend } from '@/utils';
import type { DarkPattern } from '@/utils';
import type { RiskFactor, RiskLevel } from './types';

function baseRiskSentenceKey(level: RiskLevel): string {
  if (level === 'niedrig') return 'risk.explain.base.low';
  if (level === 'mittel') return 'risk.explain.base.medium';
  if (level === 'hoch') return 'risk.explain.base.high';
  if (level === 'kritisch') return 'risk.explain.base.critical';
  return 'risk.explain.base.none';
}

function describeTopFactorKey(faktor: RiskFactor | undefined): string | null {
  if (!faktor) return null;
  if (faktor.kategorie === 'betrag') return 'risk.explain.factor.amount';
  if (faktor.kategorie === 'frist') return 'risk.explain.factor.deadline';
  if (faktor.kategorie === 'vollständigkeit') return 'risk.explain.factor.completeness';
  if (faktor.kategorie === 'dark_pattern' || faktor.kategorie === 'rechtlich') return 'risk.explain.factor.legal';
  return null;
}

export function buildErklaerung(
  dok: Dokument,
  _score: number,
  level: RiskLevel,
  faktoren: RiskFactor[],
  darkPatterns: DarkPattern[],
): { key: string; params?: Record<string, string | number> } {
  const tage = getTageVerbleibend(dok.frist);
  const hauptGrund = faktoren.sort((a, b) => (b.score * b.gewicht) - (a.score * a.gewicht))[0];

  if (level === 'niedrig' && dok.betrag != null) {
    return { key: dok.betrag > 0 ? 'risk.explain.amount_payment' : 'risk.explain.amount_check' };
  }

  const factorHint = describeTopFactorKey(hauptGrund);
  if (factorHint && hauptGrund?.kategorie !== 'betrag') return { key: factorHint };

  if (tage !== null && tage < 0) return { key: 'risk.explain.deadline_overdue' };
  if (tage !== null && tage <= 3) return { key: 'risk.explain.deadline_days_left', params: { n: tage } };

  if (darkPatterns.length > 0) {
    return { key: 'risk.explain.legal_count', params: { n: darkPatterns.length } };
  }

  return { key: baseRiskSentenceKey(level) };
}
