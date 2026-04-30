import type { Dokument } from '@/store';

export type TimelineEventType =
  | 'zahlung_frist'
  | 'einspruch_frist'
  | 'vertrag_ende'
  | 'termin'
  | 'erinnerung'
  | 'dokument_eingang'
  | 'erledigt'
  | 'sonstiges';

export interface TimelineEvent {
  id: string;
  dokumentId: string;
  dokumentTitel: string;
  dokumentTyp: string;
  absender: string;
  typ: TimelineEventType;
  label: string;
  datum: string;
  tageVerbleibend: number | null;
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
  ereignisse: TimelineEvent[];
  nächstesEreignis: TimelineEvent | null;
  istKritisch: boolean;
}

export interface WochenZusammenfassung {
  gesamt: number;
  überfälligCount: number;
  heuteCount: number;
  dieseWocheCount: number;
  gesamtBetrag: number;
  kritischeDokumente: { titel: string; tage: number | null; typ: string }[];
}
