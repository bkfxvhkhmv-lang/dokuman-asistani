import type { Dokument } from '@/store';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';
import { formatBetrag, formatFrist, getTageVerbleibend } from '@/utils/formatters';

/** Eine Zeile UX: „Was muss ich tun?” — primär Bezahlbetrag, sonst FAB-Label. */
export function deriveNaechsterSchrittZeile(dok: Dokument, plan: ActionPlan | null): string | null {
  const key = plan?.primary?.key;
  if (!key) return null;
  if (key === 'zahlen' && dok.betrag != null) {
    const b = formatBetrag(dok.betrag, dok.waehrung || '€');
    return b ? `${b} bezahlen` : (plan?.primary?.label ?? null);
  }
  return plan?.primary?.label ?? null;
}

/**
 * Full-sentence primary answer: “What should I do?”
 * Returns null when no card is needed (already done, no data).
 */
export function deriveNaechsterSchrittSatz(dok: Dokument, plan: ActionPlan | null): string | null {
  if (dok.erledigt) return null;

  const conf = dok.confidence ?? null;
  if (conf !== null && conf < 0.55) {
    return 'Bitte Angaben prüfen — OCR-Konfidenz zu niedrig.';
  }

  const tage = dok.frist ? getTageVerbleibend(dok.frist) : null;
  if (tage !== null && tage < 0) {
    return 'Frist ist abgelaufen. Prüfe, ob eine Reaktion noch sinnvoll ist.';
  }

  const key = plan?.primary?.key;
  if (!key) return null;

  const fristStr = dok.frist ? formatFrist(dok.frist) : null;
  const betragStr = dok.betrag != null ? formatBetrag(dok.betrag, dok.waehrung || '€') : null;

  if (key === 'zahlen') {
    if (betragStr && fristStr) return `Diese Rechnung bis zum ${fristStr} bezahlen.`;
    if (betragStr) return `${betragStr} bezahlen.`;
    return 'Zahlung vorbereiten.';
  }
  if (key === 'kalender') {
    return fristStr
      ? `Frist bis zum ${fristStr} in den Kalender eintragen.`
      : 'Frist in den Kalender eintragen.';
  }
  if (key === 'einspruch') {
    return 'Einspruchsfrist prüfen — Mustertext steht bereit.';
  }
  if (key === 'erledigt') {
    return 'Keine sofortige Aktion nötig. Dokument archivieren.';
  }
  if (key === 'review') {
    return 'Angaben wurden nicht vollständig erkannt. Bitte prüfen.';
  }

  return plan.primary?.label ?? null;
}
