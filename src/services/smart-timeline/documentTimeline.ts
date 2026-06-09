import type { Dokument } from '@/store';

import { extractDatesFromText } from './dateExtraction';
import { buildEvent, tageVerbleibend } from './eventCore';
import type { DocumentTimeline, TimelineEvent } from './types';

export function buildDocumentTimeline(dok: Dokument): DocumentTimeline {
  const ereignisse: TimelineEvent[] = [];

  if (dok.frist) {
    const aktionKey = dok.betrag ? 'zahlen' : 'details';
    const aktionLabel = dok.betrag ? 'Jetzt zahlen' : 'Details öffnen';
    ereignisse.push(buildEvent(dok, 'zahlung_frist', 'Frist', dok.frist, 'local', aktionKey, aktionLabel));
  }

  if (['Bußgeld', 'Steuerbescheid', 'Behördenbescheid'].includes(dok.typ) && !dok.erledigt) {
    const days = dok.typ === 'Bußgeld' ? 14 : 30;
    const refDate = new Date(dok.datum || Date.now());
    refDate.setDate(refDate.getDate() + days);
    if (refDate > new Date()) {
      ereignisse.push(buildEvent(
        dok, 'einspruch_frist',
        `Einspruchsfrist (${days} Tage ab Eingang)`,
        refDate.toISOString(), 'calculated',
        'einspruch', 'Einspruch erstellen',
      ));
    }
  }

  if (dok.rohText) {
    const extracted = extractDatesFromText(dok.rohText, dok.typ);
    for (const ed of extracted) {
      const alreadyAdded = ereignisse.some(e => e.datum.slice(0, 10) === ed.iso.slice(0, 10));
      if (!alreadyAdded) {
        ereignisse.push(buildEvent(dok, ed.typ, ed.label, ed.iso, 'local'));
      }
    }
  }

  ereignisse.push(buildEvent(dok, 'dokument_eingang', 'Dokument erfasst', dok.datum, 'local'));

  if (dok.erledigt) {
    ereignisse.push(buildEvent(dok, 'erledigt', 'Erledigt markiert', dok.datum, 'local'));
  }

  ereignisse.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());

  const future = ereignisse.filter(e => {
    const t = tageVerbleibend(e.datum);
    return t !== null && t >= 0 && !e.erledigt;
  });

  const nächstesEreignis = future.find(e =>
    e.typ !== 'dokument_eingang' && e.typ !== 'erledigt',
  ) ?? future[0] ?? null;

  const istKritisch = ereignisse.some(e => e.priorität === 'kritisch' && !e.erledigt);

  return { dokumentId: dok.id, ereignisse, nächstesEreignis, istKritisch };
}
