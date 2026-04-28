import { getTageVerbleibend } from '../utils';
import type { Dokument } from '../store';

export interface SmartFolder {
  id:    string;
  label: string;
  emoji: string;
  color: string;
  docs:  Dokument[];
  count: number;
}

type FolderDef = {
  id:       string;
  label:    string;
  emoji:    string;
  color:    string;
  priority: number;
  filter:   (d: Dokument) => boolean;
};

const FOLDER_DEFS: FolderDef[] = [
  {
    id: 'dringende_fristen', label: 'Dringende Fristen', emoji: '🔴', color: '#EE6055', priority: 0,
    filter: (d) => {
      if (d.erledigt) return false;
      const t = getTageVerbleibend(d.frist);
      return t !== null && t <= 3;
    },
  },
  {
    id: 'offene_zahlungen', label: 'Offene Zahlungen', emoji: '💳', color: '#4361EE', priority: 1,
    filter: (d) => !d.erledigt && !!(d.betrag as number) && (d.betrag as number) > 0 && ['Rechnung','Mahnung'].includes(d.typ),
  },
  {
    id: 'hohe_risiken', label: 'Hohe Risiken', emoji: '⚠️', color: '#FFB703', priority: 2,
    filter: (d) => !d.erledigt && d.risiko === 'hoch',
  },
  {
    id: 'letzte_30_tage', label: 'Letzte 30 Tage', emoji: '📅', color: '#1D9E75', priority: 3,
    filter: (d) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      return new Date(d.datum) >= cutoff;
    },
  },
  {
    id: 'abonnements', label: 'Abonnements', emoji: '📋', color: '#7C6EF8', priority: 4,
    filter: (d) => !d.erledigt && ['Vertrag','Kündigung'].includes(d.typ),
  },
  {
    id: 'behoerden', label: 'Behörden', emoji: '🏛️', color: '#BA7517', priority: 5,
    filter: (d) => !d.erledigt && ['Behörde','Steuer','Steuerbescheid','Bußgeld'].includes(d.typ),
  },
];

export function buildSmartFolders(docs: Dokument[]): SmartFolder[] {
  return FOLDER_DEFS
    .map((def) => ({
      id:    def.id,
      label: def.label,
      emoji: def.emoji,
      color: def.color,
      docs:  docs.filter(def.filter),
      count: 0,
    }))
    .map((f) => ({ ...f, count: f.docs.length }))
    .filter((f) => f.count > 0)
    .sort((a, b) => {
      const pa = FOLDER_DEFS.find((d) => d.id === a.id)?.priority ?? 99;
      const pb = FOLDER_DEFS.find((d) => d.id === b.id)?.priority ?? 99;
      return pa - pb;
    });
}

export function getSmartFolderDocs(folderId: string, docs: Dokument[]): Dokument[] {
  const def = FOLDER_DEFS.find((d) => d.id === folderId);
  return def ? docs.filter(def.filter) : [];
}

// Maps a smart folder to the home tab that best represents it
export const FOLDER_TAB_MAP: Record<string, string> = {
  dringende_fristen: 'Kalender',
  offene_zahlungen:  'Zahlungen',
  hohe_risiken:      'Aufgaben',
  letzte_30_tage:    'Dokumente',
  abonnements:       'Ordner',
  behoerden:         'Ordner',
};
