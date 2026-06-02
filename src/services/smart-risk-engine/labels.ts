import type { RiskLevel, RiskTrend } from './types';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return 'kritisch';
  if (score >= 60) return 'hoch';
  if (score >= 35) return 'mittel';
  if (score >= 10) return 'niedrig';
  return 'kein';
}

export function getRiskLevelLabels(lang = getLangSync()): Record<RiskLevel, string> {
  return {
    kritisch: t(lang, 'risk.level.kritisch'),
    hoch:     t(lang, 'risk.level.hoch'),
    mittel:   t(lang, 'risk.level.mittel'),
    niedrig:  t(lang, 'risk.level.niedrig'),
    kein:     t(lang, 'risk.level.kein'),
  };
}

export function getRiskTrendLabels(lang = getLangSync()): Record<RiskTrend, string> {
  return {
    verschlechtert: t(lang, 'risk.trend.worse'),
    stabil:         t(lang, 'risk.trend.stable'),
    verbessert:     t(lang, 'risk.trend.better'),
  };
}

export const LEVEL_LABELS = getRiskLevelLabels();
export const TREND_LABELS = getRiskTrendLabels();
