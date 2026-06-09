import type { Dokument } from '@/store';

import { buildDocumentTimeline } from './documentTimeline';
import { buildEvent, tageVerbleibend } from './eventCore';
import type { TimelineEvent, TimelineView, WochenZusammenfassung } from './types';

export function buildTimelineView(docs: Dokument[]): TimelineView {
  const allEvents: TimelineEvent[] = [];

  for (const dok of docs) {
    if (dok.erledigt) continue;
    const timeline = buildDocumentTimeline(dok);
    allEvents.push(...timeline.ereignisse.filter(e =>
      e.typ !== 'dokument_eingang' && e.typ !== 'erledigt',
    ));
  }

  allEvents.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());

  const seen = new Set<string>();
  const deduplicated = allEvents.filter(e => {
    const key = `${e.dokumentId}_${e.typ}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    überfällig:    deduplicated.filter(e => (e.tageVerbleibend ?? 0) < 0),
    heute:         deduplicated.filter(e => e.tageVerbleibend === 0),
    dieseWoche:    deduplicated.filter(e => (e.tageVerbleibend ?? -1) >= 1 && (e.tageVerbleibend ?? 999) <= 7),
    diesenMonat:   deduplicated.filter(e => (e.tageVerbleibend ?? -1) >= 8 && (e.tageVerbleibend ?? 999) <= 30),
    später:        deduplicated.filter(e => (e.tageVerbleibend ?? -1) > 30),
    vergangenheit: docs
      .filter(d => d.erledigt)
      .map(d => buildEvent(d, 'erledigt', 'Erledigt', d.datum, 'local'))
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
      .slice(0, 20),
  };
}

export function buildWochenZusammenfassung(docs: Dokument[]): WochenZusammenfassung {
  const view = buildTimelineView(docs);

  const kritisch = [...view.überfällig, ...view.heute, ...view.dieseWoche.filter(e => e.priorität === 'kritisch' || e.priorität === 'hoch')];

  const gesamtBetrag = [...view.überfällig, ...view.heute, ...view.dieseWoche]
    .map(e => docs.find(d => d.id === e.dokumentId))
    .filter((d): d is Dokument => !!d && !!d.betrag)
    .reduce((s, d) => s + ((d.betrag as number) || 0), 0);

  return {
    gesamt: view.überfällig.length + view.heute.length + view.dieseWoche.length,
    überfälligCount: view.überfällig.length,
    heuteCount:      view.heute.length,
    dieseWocheCount: view.dieseWoche.length,
    gesamtBetrag,
    kritischeDokumente: kritisch.slice(0, 5).map(e => ({
      titel: e.dokumentTitel,
      tage:  e.tageVerbleibend,
      typ:   e.dokumentTyp,
    })),
  };
}
