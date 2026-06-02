import type { Dokument } from '@/store';
import { getTageVerbleibend } from '@/utils';
import type { RiskTrend } from './types';

export function calculateTrend(dok: Dokument, currentScore: number): RiskTrend {
  const tage = getTageVerbleibend(dok.frist);

  if (tage !== null) {
    if (tage < 0)  return 'worse';
    if (tage <= 3) return 'worse';
    if (tage > 14) return 'stable';
  }
  if (dok.erledigt) return 'better';
  if (currentScore > 70) return 'worse';
  return 'stable';
}
