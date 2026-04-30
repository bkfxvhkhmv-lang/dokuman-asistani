import type { Dokument } from '@/store';

import { buildHandlungsempfehlungen, buildRisikoHinweise } from './hints';
import { buildKernPunkte } from './kernPunkte';
import { buildKurzSatz } from './kurzSatz';
import type { SummaryMode, SummaryResult } from './types';

export function buildLocalSummary(dok: Dokument, mode: SummaryMode): SummaryResult {
  const start = Date.now();
  const kurzSatz = buildKurzSatz(dok);
  const kernPunkte = buildKernPunkte(dok);
  const risikoHinweise = buildRisikoHinweise(dok);
  const handlungsempfehlungen = buildHandlungsempfehlungen(dok);

  let detailText: string | null = null;
  if (mode === 'detailliert') {
    detailText = [
      `**${dok.typ} von ${dok.absender}**`,
      '',
      kurzSatz,
      '',
      '**Kernpunkte:**',
      ...kernPunkte.map(p => `• ${p}`),
      '',
      risikoHinweise.length > 0 ? `**Risiken:**\n${risikoHinweise.map(r => `• ${r}`).join('\n')}` : '',
      handlungsempfehlungen.length > 0 ? `\n**Empfehlungen:**\n${handlungsempfehlungen.map(e => `• ${e}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
  }

  return {
    mode,
    kurzSatz,
    kernPunkte,
    detailText,
    risikoHinweise,
    handlungsempfehlungen,
    quelle: 'lokal',
    verarbeitungMs: Date.now() - start,
  };
}
