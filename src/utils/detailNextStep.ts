import type { Dokument } from '@/store';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';
import { formatBetrag, formatFrist, getTageVerbleibend } from '@/utils/formatters';

function overdueGuidance(dok: Dokument): string {
  const typ = dok.typ?.toLowerCase() ?? '';
  if (typ.includes('rechnung') || typ.includes('mahnung'))
    return 'Frist ist abgelaufen. Prüfe, ob die Zahlung noch aussteht, und kontaktiere ggf. den Absender.';
  if (typ.includes('einspruch') || typ.includes('bussgeldbescheid') || typ.includes('bescheid'))
    return 'Frist ist abgelaufen. Prüfe, ob ein Einspruch noch möglich ist — keine Rechtsberatung.';
  if (typ.includes('versicherung') || typ.includes('vertrag'))
    return 'Frist ist abgelaufen. Prüfe Kündigungsrechte oder kontaktiere den Anbieter.';
  if (typ.includes('termin'))
    return 'Termin ist abgelaufen. Neuen Termin vereinbaren oder Anbieter kontaktieren.';
  return 'Frist ist abgelaufen. Prüfe Zahlung, Antwort oder mögliche nächste Schritte.';
}

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
    return overdueGuidance(dok);
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
  if (key === 'mail') {
    return fristStr
      ? `Antwort per E-Mail vorbereiten — Frist bis ${fristStr}.`
      : 'Antwort oder Weiterleitung per E-Mail vorbereiten.';
  }
  if (key === 'ai') {
    return 'Dokument analysieren lassen — KI erklärt Inhalt und Risiken.';
  }

  return null;
}
