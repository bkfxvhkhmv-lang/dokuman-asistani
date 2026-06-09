import type { Dokument } from '@/store';
import { getTageVerbleibend } from '@/utils';
import type { DarkPattern } from '@/utils';
import type { RiskFactor, RiskReduction } from './types';

export function buildReductionSuggestions(
  dok: Dokument,
  faktoren: RiskFactor[],
  darkPatterns: DarkPattern[],
): RiskReduction[] {
  const suggestions: RiskReduction[] = [];
  const tage = getTageVerbleibend(dok.frist);

  if (tage !== null && tage <= 7 && tage >= 0 && dok.betrag) {
    suggestions.push({
      aktion: 'zahlen',
      beschreibungKey: 'risk.reduce.pay_now',
      wirkungKey: 'risk.reduce.effect_points',
      wirkungParams: { points: 30 },
      dringlichkeit: 'sofort',
      icon: 'currency-eur',
    });
  }

  if (['Bußgeld', 'Steuerbescheid'].includes(dok.typ) && !dok.erledigt) {
    suggestions.push({
      aktion: 'einspruch',
      beschreibungKey: 'risk.reduce.appeal',
      wirkungKey: 'risk.reduce.effect_points_if_valid',
      wirkungParams: { points: 25 },
      dringlichkeit: tage !== null && tage <= 5 ? 'sofort' : 'diese_woche',
      icon: 'pencil-simple',
    });
  }

  const vollFaktor = faktoren.find(f => f.kategorie === 'vollständigkeit');
  if (vollFaktor && vollFaktor.score > 30) {
    suggestions.push({
      aktion: 'bearbeiten',
      beschreibungKey: 'risk.reduce.complete_fields',
      wirkungKey: 'risk.reduce.effect_points',
      wirkungParams: { points: 15 },
      dringlichkeit: 'bald',
      icon: 'pencil-simple',
    });
  }

  if (darkPatterns.length > 0) {
    suggestions.push({
      aktion: 'prüfen',
      beschreibungKey: 'risk.reduce.legal_check',
      beschreibungParams: { n: darkPatterns.length },
      wirkungKey: 'risk.reduce.effect_points_after_clarify',
      wirkungParams: { points: 20 },
      dringlichkeit: 'diese_woche',
      icon: 'gavel',
    });
  }

  if (dok.frist && !dok.erledigt && tage !== null && tage > 0) {
    const hasReminder = (dok.aufgaben || []).some(a => (a as { type?: string }).type === 'reminder');
    if (!hasReminder) {
      suggestions.push({
        aktion: 'erinnerung',
        beschreibungKey: 'risk.reduce.reminder',
        wirkungKey: 'risk.reduce.effect_points_proactive',
        wirkungParams: { points: 5 },
        dringlichkeit: 'bald',
        icon: 'bell',
      });
    }
  }

  return suggestions.slice(0, 4);
}
