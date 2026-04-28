import type { Dokument } from '../store';

export interface DocStack {
  id:       string;      // stable key = lead doc id
  absender: string;
  docs:     Dokument[];  // sorted: most urgent first
  lead:     Dokument;    // shown on top
  isStack:  boolean;     // true when count >= THRESHOLD
}

const STACK_THRESHOLD = 2;

function urgencyScore(d: Dokument): number {
  if (d.erledigt) return 9000;
  const tage = d.frist
    ? Math.ceil((new Date(d.frist).getTime() - Date.now()) / 86_400_000)
    : null;
  if (tage !== null && tage < 0) return tage;      // overdue → most negative = first
  if (tage !== null)              return tage;       // soonest deadline first
  if (d.risiko === 'hoch')        return 100;
  if (d.risiko === 'mittel')      return 200;
  return 300;
}

/**
 * Groups documents by sender and sorts each group by urgency.
 * Returns stacks sorted so the most urgent stack comes first.
 */
export function buildDocStacks(docs: Dokument[]): DocStack[] {
  const map: Record<string, Dokument[]> = {};
  for (const d of docs) {
    const key = (d.absender || 'Unbekannt').trim();
    (map[key] ??= []).push(d);
  }

  return Object.entries(map)
    .map(([absender, ds]) => {
      const sorted = [...ds].sort((a, b) => urgencyScore(a) - urgencyScore(b));
      return {
        id:       sorted[0].id,
        absender,
        docs:     sorted,
        lead:     sorted[0],
        isStack:  sorted.length >= STACK_THRESHOLD,
      };
    })
    .sort((a, b) => urgencyScore(a.lead) - urgencyScore(b.lead));
}
