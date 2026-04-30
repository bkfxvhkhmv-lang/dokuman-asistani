import type { Dokument } from '@/store';

import type { TimelineEvent, TimelineEventType } from './types';

export const EVENT_ICONS: Record<TimelineEventType, string> = {
  zahlung_frist:   '💶',
  einspruch_frist: '✍️',
  vertrag_ende:    '📋',
  termin:          '📅',
  erinnerung:      '🔔',
  dokument_eingang:'📬',
  erledigt:        '✅',
  sonstiges:       '📌',
};

export const EVENT_PRIO: Record<TimelineEventType, 'kritisch' | 'hoch' | 'mittel' | 'niedrig'> = {
  zahlung_frist:   'hoch',
  einspruch_frist: 'hoch',
  vertrag_ende:    'mittel',
  termin:          'mittel',
  erinnerung:      'mittel',
  dokument_eingang:'niedrig',
  erledigt:        'niedrig',
  sonstiges:       'niedrig',
};

export function tageVerbleibend(iso: string): number | null {
  try {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  } catch {
    return null;
  }
}

export function buildEvent(
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
