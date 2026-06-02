import type { Dokument } from '@/store';
import type { PeerComparison } from './types';

/** Minimum peers needed for a statistically meaningful comparison. */
const MIN_PEERS = 5;

export function buildPeerComparison(dok: Dokument, alleDocs: Dokument[]): PeerComparison | null {
  const similar = alleDocs.filter(d => d.id !== dok.id && d.typ === dok.typ && !d.erledigt);
  // Below MIN_PEERS the average is unreliable and would produce misleading risk alerts
  if (similar.length < MIN_PEERS) return null;

  const risikoMap: Record<string, number> = { hoch: 3, mittel: 2, niedrig: 1 };
  const avgScore = similar.reduce((s, d) => s + (risikoMap[d.risiko] || 1), 0) / similar.length;
  const myScore = risikoMap[dok.risiko] || 1;

  const durchschnittRisiko = avgScore > 2.5 ? 'hoch' : avgScore > 1.5 ? 'mittel' : 'niedrig';
  const istSchlechterAlsDurchschnitt = myScore > avgScore + 0.5;

  return {
    aehnlicheDokumente: similar.length,
    durchschnittRisiko,
    istSchlechterAlsDurchschnitt,
    beschreibungKey: istSchlechterAlsDurchschnitt
      ? 'risk.peer.description_higher'
      : 'risk.peer.description_normal',
    beschreibungParams: istSchlechterAlsDurchschnitt
      ? { n: similar.length, risk: durchschnittRisiko }
      : { type: dok.typ },
  };
}
