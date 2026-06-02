import type { Dokument } from '@/store';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';
import { formatBetrag, formatFrist, getTageVerbleibend } from '@/utils/formatters';
import { hasCompletePaymentTarget } from '@/utils/documentGuards';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

function LT(key: string, vars?: Record<string, string | number>) {
  return t(getLangSync(), key, vars);
}

function overdueGuidance(dok: Dokument): string {
  const typ = dok.typ?.toLowerCase() ?? '';
  if (typ.includes('rechnung') || typ.includes('mahnung'))
    return LT('detail.next.overdue_payment');
  if (typ.includes('einspruch') || typ.includes('bussgeldbescheid') || typ.includes('bescheid'))
    return LT('detail.next.overdue_appeal');
  if (typ.includes('versicherung') || typ.includes('vertrag'))
    return LT('detail.next.overdue_contract');
  if (typ.includes('termin'))
    return LT('detail.next.overdue_appointment');
  return LT('detail.next.overdue_generic');
}

/** Eine Zeile UX: „Was muss ich tun?” — primär Bezahlbetrag, sonst FAB-Label. */
export function deriveNaechsterSchrittZeile(dok: Dokument, plan: ActionPlan | null): string | null {
  const key = plan?.primary?.key;
  if (!key) return null;
  if (key === 'zahlen' && dok.betrag != null) {
    const b = formatBetrag(dok.betrag, dok.waehrung || '€');
    return b ? LT('detail.next.line.pay', { amount: b }) : (plan?.primary?.label ?? null);
  }
  if (key === 'gutschrift' && dok.betrag != null) {
    const b = formatBetrag(Math.abs(dok.betrag), dok.waehrung || '€');
    return b ? LT('detail.next.line.credit', { amount: b }) : LT('detail.next.credit_check');
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
  if (conf !== null && conf < 55) {
    return LT('detail.next.check_some');
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
    if (!hasCompletePaymentTarget(dok)) {
      return dok.betrag != null
        ? LT('detail.next.check_amount_before_payment')
        : LT('detail.next.check_payment_data');
    }
    if (betragStr && fristStr) return LT('detail.next.pay_invoice_by', { date: fristStr });
    if (betragStr) return LT('detail.next.line.pay', { amount: betragStr });
    return LT('detail.next.prepare_payment');
  }
  if (key === 'gutschrift') {
    const absStr = dok.betrag != null ? formatBetrag(Math.abs(dok.betrag), dok.waehrung || '€') : null;
    return absStr
      ? LT('detail.next.credit_no_payment', { amount: absStr })
      : LT('detail.next.credit_generic');
  }
  if (key === 'kalender') {
    return fristStr
      ? LT('detail.next.calendar_by', { date: fristStr })
      : LT('detail.next.calendar_generic');
  }
  if (key === 'einspruch') {
    return LT('detail.next.appeal');
  }
  if (key === 'erledigt') {
    return LT('detail.next.done_archive');
  }
  if (key === 'review') {
    return LT('detail.next.review_incomplete');
  }
  if (key === 'mail') {
    return fristStr
      ? LT('detail.next.mail_by', { date: fristStr })
      : LT('detail.next.mail_generic');
  }
  if (key === 'ai') {
    if (dok.confidence == null) return LT('detail.next.ai');
    return null;
  }

  return null;
}
