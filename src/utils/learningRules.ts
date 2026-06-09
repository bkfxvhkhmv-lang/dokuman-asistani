import type { Dokument } from '@/store';

export interface LernVorschlag {
  id: string; absenderPattern: string; felder: Record<string, string>;
  anwendungen: number; erstellt: string; label: string;
}

export interface LernRegelResult {
  changes: Record<string, string>; regelId: string | null; regelLabel?: string;
}

function extrahiereAbsenderPattern(absender: string | null | undefined): string | null {
  if (!absender) return null;
  const stopWords = new Set(['gmbh', 'ag', 'ev', 'kg', 'ohg', 'inc', 'ltd', 'se', 'co', 'und', 'der', 'die', 'das']);
  const worte = absender
    .toLowerCase()
    .replace(/[^a-zäöüß0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);
  return worte.find(w => !stopWords.has(w)) || worte[0] || null;
}

const LERNBARE_FIELDS = ['typ', 'risiko', 'userOrdner'] as const;

export function erkenneLernvorschlag(altDok: Dokument, neueFelder: Partial<Dokument>): LernVorschlag | null {
  const geaendert: Record<string, string> = {};
  for (const f of LERNBARE_FIELDS) {
    const neu = neueFelder[f];
    const alt = altDok[f];
    if (neu !== undefined && neu !== alt) geaendert[f] = String(neu);
  }
  if (Object.keys(geaendert).length === 0) return null;
  const pattern = extrahiereAbsenderPattern(altDok.absender);
  if (!pattern) return null;
  const feldBeschreibungen = Object.entries(geaendert)
    .map(([f, v]) => {
      if (f === 'typ') return `Typ → ${v}`;
      if (f === 'risiko') return `Risiko → ${v}`;
      if (f === 'userOrdner') return `Ordner → ${v}`;
      return `${f} → ${v}`;
    })
    .join(', ');
  return {
    id: Date.now().toString(36),
    absenderPattern: pattern,
    felder: geaendert,
    anwendungen: 0,
    erstellt: new Date().toISOString(),
    label: `"${pattern}" → ${feldBeschreibungen}`,
  };
}

export function wendeLernRegelnAn(dokData: Partial<Dokument>, lernRegeln: LernVorschlag[]): LernRegelResult {
  if (!lernRegeln?.length || !dokData.absender) return { changes: {}, regelId: null };
  const absenderLower = dokData.absender.toLowerCase();
  for (const regel of lernRegeln) {
    if (absenderLower.includes(regel.absenderPattern.toLowerCase())) {
      return { changes: { ...regel.felder }, regelId: regel.id, regelLabel: regel.label };
    }
  }
  return { changes: {}, regelId: null };
}
