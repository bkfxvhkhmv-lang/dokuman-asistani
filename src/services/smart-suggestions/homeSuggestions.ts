import type { Dokument } from '@/store';
import type { HomeSuggestion, SuggestionPriority } from './types';
import { tageVerbleibend } from './helpers';
import { safeDisplayTitel } from '@/utils/displaySanitizer';

export function runHomeSuggestions(docs: Dokument[]): HomeSuggestion[] {
  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const result: HomeSuggestion[] = [];

  const überfällig = docs.filter(d => !d.erledigt && d.frist && new Date(d.frist) < heute);
  if (überfällig.length > 0) {
    result.push({
      icon: '🚨', titel: `${überfällig.length} überfällige Dokument${überfällig.length > 1 ? 'e' : ''}`,
      beschreibung: `${überfällig.map(d => d.absender || d.typ).slice(0, 2).join(', ')}${überfällig.length > 2 ? ` +${überfällig.length - 2}` : ''}`,
      priority: 'kritisch', aktion: 'filter_überfällig',
    });
  }

  const dieseWoche = docs.filter(d => {
    if (!d.frist || d.erledigt) return false;
    const t = tageVerbleibend(d.frist);
    return t !== null && t >= 0 && t <= 7;
  });
  if (dieseWoche.length > 0 && überfällig.length === 0) {
    result.push({
      icon: '⏰', titel: `${dieseWoche.length} Dokument${dieseWoche.length > 1 ? 'e' : ''} diese Woche fällig`,
      beschreibung: dieseWoche.slice(0, 2).map(d => safeDisplayTitel(d.titel, d.typ, d.confidence)).join(', '),
      priority: 'hoch', aktion: 'filter_diese_woche',
    });
  }

  const ungelesen = docs.filter(d => !d.gelesen && !d.erledigt);
  if (ungelesen.length >= 3) {
    result.push({
      icon: '📬', titel: `${ungelesen.length} ungelesene Dokumente`,
      beschreibung: 'Neue Dokumente warten auf Ihre Aufmerksamkeit',
      priority: 'mittel', aktion: 'filter_ungelesen',
    });
  }

  const offenBetrag = docs.filter(d => !d.erledigt && d.betrag && (d.betrag as number) > 0)
    .reduce((s, d) => s + ((d.betrag as number) || 0), 0);
  if (offenBetrag >= 100) {
    result.push({
      icon: '€', titel: `${offenBetrag.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} € offen`,
      beschreibung: 'Gesamtsumme aller offenen Zahlungen',
      priority: (offenBetrag >= 500 ? 'hoch' : 'mittel') as SuggestionPriority,
      aktion: 'filter_offen_betrag',
    });
  }

  return result.slice(0, 5);
}
