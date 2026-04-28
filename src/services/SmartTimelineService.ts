/**
 * Smart Timeline — V12 Sprint 2
 *
 * Offline-first date intelligence:
 * - Extract ALL dates from a document (not just the main frist)
 * - Classify each date: payment_due, deadline, contract_end, reminder, etc.
 * - Build "this week / upcoming / past" views across all docs
 * - Online: merge with backend timeline events
 */

import type { Dokument } from '../store';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TimelineEventType =
  | 'zahlung_frist'       // Zahlungsfrist
  | 'einspruch_frist'     // Einspruchsfrist (calculated)
  | 'vertrag_ende'        // Vertragsende / Kündigung
  | 'termin'              // Behörden/Arzttermin
  | 'erinnerung'          // User-set reminder
  | 'dokument_eingang'    // When document was received
  | 'erledigt'            // When marked as done
  | 'sonstiges';          // Generic extracted date

export interface TimelineEvent {
  id: string;
  dokumentId: string;
  dokumentTitel: string;
  dokumentTyp: string;
  absender: string;
  typ: TimelineEventType;
  label: string;
  datum: string;                  // ISO
  tageVerbleibend: number | null; // negative = past
  icon: string;
  priorität: 'kritisch' | 'hoch' | 'mittel' | 'niedrig';
  erledigt: boolean;
  aktionLabel?: string;
  aktionKey?: string;
  quelle: 'local' | 'server' | 'calculated';
}

export interface TimelineView {
  überfällig:   TimelineEvent[];
  heute:        TimelineEvent[];
  dieseWoche:   TimelineEvent[];
  diesenMonat:  TimelineEvent[];
  später:       TimelineEvent[];
  vergangenheit: TimelineEvent[];
}

export interface DocumentTimeline {
  dokumentId: string;
  ereignisse: TimelineEvent[];     // all events for this document
  nächstesEreignis: TimelineEvent | null;
  istKritisch: boolean;
}

// ── Date extraction from raw text ─────────────────────────────────────────────

interface ExtractedDate {
  iso: string;
  label: string;
  typ: TimelineEventType;
  kontext: string;
}

const DATE_PATTERNS: { pattern: RegExp; label: string; typ: TimelineEventType }[] = [
  { pattern: /zahlungsfrist[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,  label: 'Zahlungsfrist',    typ: 'zahlung_frist' },
  { pattern: /fällig(?:\s+am)?[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i, label: 'Fällig',         typ: 'zahlung_frist' },
  { pattern: /bis\s+(?:spätestens\s+)?(?:zum\s+)?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i, label: 'Bis',  typ: 'zahlung_frist' },
  { pattern: /vertragsende[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,   label: 'Vertragsende',     typ: 'vertrag_ende' },
  { pattern: /kündigung.*?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,         label: 'Kündigung',        typ: 'vertrag_ende' },
  { pattern: /laufzeit.*?bis[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i, label: 'Laufzeitende',     typ: 'vertrag_ende' },
  { pattern: /termin[:\s]+(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,         label: 'Termin',           typ: 'termin' },
  { pattern: /vorladung.*?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,         label: 'Vorladung',        typ: 'termin' },
  { pattern: /einspruchsfrist.*?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i,   label: 'Einspruchsfrist',  typ: 'einspruch_frist' },
  { pattern: /widerspruchsfrist.*?(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/i, label: 'Widerspruchsfrist',typ: 'einspruch_frist' },
];

function parseDE(tag: number, monat: number, jahr: number): string | null {
  if (tag < 1 || tag > 31 || monat < 1 || monat > 12 || jahr < 2020 || jahr > 2040) return null;
  try {
    return new Date(jahr, monat - 1, tag, 12, 0, 0).toISOString();
  } catch { return null; }
}

export function extractDatesFromText(rohText: string, typ: string): ExtractedDate[] {
  if (!rohText || rohText.length < 20) return [];
  const found: ExtractedDate[] = [];
  const seen = new Set<string>();

  for (const { pattern, label, typ: evTyp } of DATE_PATTERNS) {
    const m = rohText.match(pattern);
    if (m) {
      const iso = parseDE(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
      if (iso && !seen.has(iso)) {
        seen.add(iso);
        found.push({ iso, label, typ: evTyp, kontext: m[0].slice(0, 40) });
      }
    }
  }

  // Calculated: Einspruchsfrist from receipt date for Bußgeld/Steuerbescheid
  if ((typ === 'Bußgeld' || typ === 'Steuerbescheid') && found.length === 0) {
    const refDate = new Date();
    const days = typ === 'Bußgeld' ? 14 : 30;
    refDate.setDate(refDate.getDate() + days);
    found.push({
      iso: refDate.toISOString(),
      label: `Einspruchsfrist (berechnet, ${days} Tage)`,
      typ: 'einspruch_frist',
      kontext: 'Automatisch berechnet',
    });
  }

  return found;
}

// ── Event building ─────────────────────────────────────────────────────────────

const EVENT_ICONS: Record<TimelineEventType, string> = {
  zahlung_frist:   '💶',
  einspruch_frist: '✍️',
  vertrag_ende:    '📋',
  termin:          '📅',
  erinnerung:      '🔔',
  dokument_eingang:'📬',
  erledigt:        '✅',
  sonstiges:       '📌',
};

const EVENT_PRIO: Record<TimelineEventType, 'kritisch' | 'hoch' | 'mittel' | 'niedrig'> = {
  zahlung_frist:   'hoch',
  einspruch_frist: 'hoch',
  vertrag_ende:    'mittel',
  termin:          'mittel',
  erinnerung:      'mittel',
  dokument_eingang:'niedrig',
  erledigt:        'niedrig',
  sonstiges:       'niedrig',
};

function tageVerbleibend(iso: string): number | null {
  try {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  } catch { return null; }
}

function buildEvent(
  dok: Dokument,
  typ: TimelineEventType,
  label: string,
  datum: string,
  quelle: 'local' | 'server' | 'calculated',
  aktionKey?: string,
  aktionLabel?: string,
): TimelineEvent {
  const tage = tageVerbleibend(datum);
  let priorität = EVENT_PRIO[typ];
  if (tage !== null && tage < 0 && (typ === 'zahlung_frist' || typ === 'einspruch_frist')) {
    priorität = 'kritisch';
  } else if (tage !== null && tage <= 3 && priorität !== 'kritisch') {
    priorität = 'kritisch';
  } else if (tage !== null && tage <= 7 && priorität === 'mittel') {
    priorität = 'hoch';
  }
  return {
    id: `${dok.id}_${typ}_${datum}`,
    dokumentId:     dok.id,
    dokumentTitel:  dok.titel,
    dokumentTyp:    dok.typ,
    absender:       dok.absender,
    typ,
    label,
    datum,
    tageVerbleibend: tage,
    icon:            EVENT_ICONS[typ],
    priorität,
    erledigt:        dok.erledigt || false,
    aktionKey,
    aktionLabel,
    quelle,
  };
}

// ── Per-document timeline ──────────────────────────────────────────────────────

export function buildDocumentTimeline(dok: Dokument): DocumentTimeline {
  const ereignisse: TimelineEvent[] = [];

  // Main frist
  if (dok.frist) {
    const aktionKey = dok.betrag ? 'zahlen' : 'details';
    const aktionLabel = dok.betrag ? 'Jetzt zahlen' : 'Details öffnen';
    ereignisse.push(buildEvent(dok, 'zahlung_frist', 'Frist', dok.frist, 'local', aktionKey, aktionLabel));
  }

  // Einspruchsfrist (calculated for relevant types)
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

  // Dates extracted from rohText
  if (dok.rohText) {
    const extracted = extractDatesFromText(dok.rohText, dok.typ);
    for (const ed of extracted) {
      const alreadyAdded = ereignisse.some(e => e.datum.slice(0, 10) === ed.iso.slice(0, 10));
      if (!alreadyAdded) {
        ereignisse.push(buildEvent(dok, ed.typ, ed.label, ed.iso, 'local'));
      }
    }
  }

  // Dokument received
  ereignisse.push(buildEvent(dok, 'dokument_eingang', 'Dokument erfasst', dok.datum, 'local'));

  // Erledigt
  if (dok.erledigt) {
    ereignisse.push(buildEvent(dok, 'erledigt', 'Erledigt markiert', dok.datum, 'local'));
  }

  // Sort by date asc
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

// ── Cross-document timeline view ──────────────────────────────────────────────

export function buildTimelineView(docs: Dokument[]): TimelineView {
  const allEvents: TimelineEvent[] = [];

  for (const dok of docs) {
    if (dok.erledigt) continue;
    const timeline = buildDocumentTimeline(dok);
    // Include only the main events per document (not every extracted date)
    allEvents.push(...timeline.ereignisse.filter(e =>
      e.typ !== 'dokument_eingang' && e.typ !== 'erledigt',
    ));
  }

  // Sort all events by date
  allEvents.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());

  // Deduplicate same doc+typ (keep earliest)
  const seen = new Set<string>();
  const deduplicated = allEvents.filter(e => {
    const key = `${e.dokumentId}_${e.typ}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const heute = new Date(); heute.setHours(0, 0, 0, 0);
  const morgen = new Date(heute); morgen.setDate(morgen.getDate() + 1);
  const wochenende = new Date(heute); wochenende.setDate(wochenende.getDate() + 7);
  const monatsende = new Date(heute); monatsende.setDate(monatsende.getDate() + 30);

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

// ── "Diese Woche" summary for home screen ─────────────────────────────────────

export interface WochenZusammenfassung {
  gesamt: number;
  überfälligCount: number;
  heuteCount: number;
  dieseWocheCount: number;
  gesamtBetrag: number;
  kritischeDokumente: { titel: string; tage: number | null; typ: string }[];
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
