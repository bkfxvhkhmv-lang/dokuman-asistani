import type { Dokument } from '@/store';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';
import { formatBetrag } from '@/utils/formatters';

/** Eine Zeile UX: „Was muss ich tun?“ — primär Bezahlbetrag, sonst FAB-Label. */
export function deriveNaechsterSchrittZeile(dok: Dokument, plan: ActionPlan | null): string | null {
  const key = plan?.primary?.key;
  if (!key) return null;
  if (key === 'zahlen' && dok.betrag != null) {
    const b = formatBetrag(dok.betrag, dok.waehrung || '€');
    return b ? `${b} bezahlen` : (plan?.primary?.label ?? null);
  }
  return plan?.primary?.label ?? null;
}
