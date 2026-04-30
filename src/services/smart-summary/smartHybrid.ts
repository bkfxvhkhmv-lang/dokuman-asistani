import type { Dokument } from '@/store';
import { explainDocumentSafe } from '@/services/v4Api';
import { isOnline } from '@/services/offlineQueue';

import { buildLocalSummary } from './localSummary';
import type { SummaryMode, SummaryResult } from './types';

export async function buildSmartSummary(
  dok: Dokument,
  mode: SummaryMode,
  lang = 'de',
): Promise<SummaryResult> {
  const local = buildLocalSummary(dok, mode);

  if (mode !== 'detailliert' || !dok.v4DocId) return local;

  try {
    const online = await isOnline();
    if (!online) return local;

    const explainResult = await explainDocumentSafe(dok.v4DocId, lang);
    if (!explainResult?.text) return local;

    return {
      ...local,
      detailText: explainResult.text,
      quelle: 'ki_cloud',
    };
  } catch {
    return local;
  }
}
