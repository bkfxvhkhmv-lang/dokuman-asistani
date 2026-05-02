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
      beschreibung: 'Zahlung sofort ausführen',
      wirkung: '−30 Punkte',
      dringlichkeit: 'sofort',
      icon: 'currency-eur',
    });
  }

  if (['Bußgeld', 'Steuerbescheid'].includes(dok.typ) && !dok.erledigt) {
    suggestions.push({
      aktion: 'einspruch',
      beschreibung: 'Einspruch prüfen und ggf. einlegen',
      wirkung: '−25 Punkte wenn berechtigt',
      dringlichkeit: tage !== null && tage <= 5 ? 'sofort' : 'diese_woche',
      icon: 'pencil-simple',
    });
  }

  const vollFaktor = faktoren.find(f => f.kategorie === 'vollständigkeit');
  if (vollFaktor && vollFaktor.score > 30) {
    suggestions.push({
      aktion: 'bearbeiten',
      beschreibung: 'Fehlende Felder ergänzen (Betrag, Frist)',
      wirkung: '−15 Punkte',
      dringlichkeit: 'bald',
      icon: 'pencil-simple',
    });
  }

  if (darkPatterns.length > 0) {
    suggestions.push({
      aktion: 'prüfen',
      beschreibung: `${darkPatterns.length} rechtliche Auffälligkeit${darkPatterns.length > 1 ? 'en' : ''} prüfen`,
      wirkung: '−20 Punkte nach Klärung',
      dringlichkeit: 'diese_woche',
      icon: 'gavel',
    });
  }

  if (dok.frist && !dok.erledigt && tage !== null && tage > 0) {
    const hasReminder = (dok.aufgaben || []).some(a => (a as { type?: string }).type === 'reminder');
    if (!hasReminder) {
      suggestions.push({
        aktion: 'erinnerung',
        beschreibung: 'Erinnerung einrichten',
        wirkung: '−5 Punkte (proaktive Kontrolle)',
        dringlichkeit: 'bald',
        icon: 'bell',
      });
    }
  }

  return suggestions.slice(0, 4);
}
