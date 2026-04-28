/**
 * useSmartTimeline — V12 Sprint 2
 * Wraps SmartTimelineService with React state + hybrid server merge.
 */

import { useMemo, useEffect, useState } from 'react';
import {
  buildDocumentTimeline,
  buildTimelineView,
  buildWochenZusammenfassung,
  type DocumentTimeline,
  type TimelineView,
  type TimelineEvent,
  type WochenZusammenfassung,
} from '../services/SmartTimelineService';
import { TimelineEngineV4 } from '../core/events/TimelineEngineV4';
import type { Dokument } from '../store';

// ── Per-document timeline hook ─────────────────────────────────────────────────

export function useDocumentTimeline(dok: Dokument | null) {
  const [serverEvents, setServerEvents] = useState<TimelineEvent[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);

  // Local timeline — instant
  const localTimeline: DocumentTimeline | null = useMemo(
    () => (dok ? buildDocumentTimeline(dok) : null),
    [dok],
  );

  // Online enrichment — non-blocking
  useEffect(() => {
    if (!dok?.v4DocId) return;
    let cancelled = false;
    setLoadingServer(true);
    TimelineEngineV4.getTimeline(dok.id)
      .then(entries => {
        if (cancelled) return;
        const mapped: TimelineEvent[] = entries
          .filter(e => e.source === 'server')
          .map(e => ({
            id:              String(e.id),
            dokumentId:      dok.id,
            dokumentTitel:   dok.titel,
            dokumentTyp:     dok.typ,
            absender:        dok.absender,
            typ:             'sonstiges' as const,
            label:           String(e.eventName),
            datum:           e.createdAt.toISOString(),
            tageVerbleibend: null,
            icon:            '🔵',
            priorität:       'niedrig' as const,
            erledigt:        dok.erledigt,
            quelle:          'server' as const,
          }));
        setServerEvents(mapped);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingServer(false); });
    return () => { cancelled = true; };
  }, [dok?.v4DocId, dok?.id]);

  // Merge local + server
  const mergedEreignisse: TimelineEvent[] = useMemo(() => {
    if (!localTimeline) return [];
    const localIds = new Set(localTimeline.ereignisse.map(e => e.id));
    const newServer = serverEvents.filter(e => !localIds.has(e.id));
    return [...localTimeline.ereignisse, ...newServer]
      .sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());
  }, [localTimeline, serverEvents]);

  return {
    ereignisse:       mergedEreignisse,
    nächstesEreignis: localTimeline?.nächstesEreignis ?? null,
    istKritisch:      localTimeline?.istKritisch ?? false,
    loadingServer,
  };
}

// ── Cross-document timeline view hook ──────────────────────────────────────────

export function useTimelineView(docs: Dokument[]) {
  const view: TimelineView = useMemo(() => buildTimelineView(docs), [docs]);
  const wochenZusammenfassung: WochenZusammenfassung = useMemo(
    () => buildWochenZusammenfassung(docs),
    [docs],
  );

  return { view, wochenZusammenfassung };
}
