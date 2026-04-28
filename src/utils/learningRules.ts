import type { Dokument } from '../store';

export interface LernVorschlag {
  id: string; absenderPattern: string; felder: Record<string, string>;
  anwendungen: number; erstellt: string; label: string;
}

export interface LernRegelResult {
  changes: Record<string, string>; regelId: string | null; regelLabel?: string;
}

function extrahiereAbsenderPattern(absender: string | null | undefined): string | null {
  if (!absender) return null;
  const stopWords = new Set(['gmbh','ag','ev','kg','ohg','inc','ltd','se','co','und','der','die','das']);
  const worte = absender.toLowerCase().replace(/[^a-zäöüß0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
  return worte.find(w => !stopWords.has(w)) || worte[0] || null;
}

export function erkenneLernvorschlag(altDok: Dokument, neueFelder: Partial<Dokument>): LernVorschlag | null {
  const LERNBARE = ['typ', 'risiko'] as const;
  const geaendert: Record<string, string> = {};
  for (const f of LERNBARE) {
    if (neueFelder[f] !== undefined && neueFelder[f] !== altDok[f]) geaendert[f] = neueFelder[f] as string;
  }
  if (Object.keys(geaendert).length === 0) return null;
  const pattern = extrahiereAbsenderPattern(altDok.absender);
  if (!pattern) return null;
  const feldBeschreibungen = Object.entries(geaendert).map(([f, v]) => f === 'typ' ? `Typ → ${v}` : f === 'risiko' ? `Risiko → ${v}` : `${f} → ${v}`).join(', ');
  return { id: Date.now().toString(36), absenderPattern: pattern, felder: geaendert, anwendungen: 0, erstellt: new Date().toISOString(), label: `"${pattern}" → ${feldBeschreibungen}` };
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
