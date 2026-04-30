import type { Dokument } from '@/store';
import { getTageVerbleibend } from '@/utils';
import type { RiskTrend } from './types';

export function calculateTrend(dok: Dokument, currentScore: number): RiskTrend {
  const tage = getTageVerbleibend(dok.frist);

  if (tage !== null) {
    if (tage < 0)  return 'verschlechtert';
    if (tage <= 3) return 'verschlechtert';
    if (tage > 14) return 'stabil';
  }
  if (dok.erledigt) return 'verbessert';
  if (currentScore > 70) return 'verschlechtert';
  return 'stabil';
}
