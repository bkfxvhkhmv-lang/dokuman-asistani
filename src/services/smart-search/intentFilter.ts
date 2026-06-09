import type { Dokument } from '@/store';
import type { SearchIntent } from './types';

export function applyIntentFilter(docs: Dokument[], intent: SearchIntent): Dokument[] {
  const heute = new Date(); heute.setHours(0, 0, 0, 0);

  switch (intent) {
    case 'zahlung_ausstehend':
      return docs.filter(d => !d.erledigt && d.betrag && (d.betrag as number) > 0);
    case 'überfällig':
      return docs.filter(d => !d.erledigt && d.frist && new Date(d.frist) < heute);
    case 'diese_woche': {
      const wochenende = new Date(heute); wochenende.setDate(wochenende.getDate() + 7);
      return docs.filter(d => {
        if (!d.frist || d.erledigt) return false;
        const f = new Date(d.frist);
        return f >= heute && f <= wochenende;
      });
    }
    case 'risikoreich':
      return docs.filter(d => d.risiko === 'hoch' && !d.erledigt);
    case 'offene_aufgaben':
      return docs.filter(d => !d.erledigt && (d.aufgaben || []).some(a => !(a as any).erledigt));
    default:
      return docs;
  }
}
