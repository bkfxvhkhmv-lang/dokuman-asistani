import type { Dokument } from '@/store';
import { inferAmountSemantics, canOfferPaymentAction, isLowConfidence } from '@/utils/documentGuards';
import { getTageVerbleibend } from '@/utils/formatters';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

export type NextStepKey =
  | 'check_credit'
  | 'review'
  | 'overdue'
  | 'urgent'
  | 'deadline_soon'
  | 'pay'
  | 'einspruch';

export type NextStepUrgency = 'critical' | 'warning' | 'info';

export interface DerivedNextStep {
  key: NextStepKey;
  label: string;
  urgency: NextStepUrgency;
}

/**
 * Single source of truth for "what does this document need right now?"
 *
 * Priority chain (highest to lowest):
 *   1. Negative amount   → check_credit  (credit before confidence: betrag<0 is not an OCR error)
 *   2. Low confidence    → review
 *   3. Overdue           → overdue
 *   4. High risk         → urgent
 *   5. Frist ≤ 7 days    → deadline_soon
 *   6. Payable + action  → pay
 *   7. Einspruch action  → einspruch
 *
 * Returns null for completed documents and when no signal is present.
 * Does NOT write to store. Does NOT format for display beyond the label.
 */
export function deriveNextStep(dok: Dokument): DerivedNextStep | null {
  const lang = getLangSync();
  if (dok.erledigt) return null;

  if (inferAmountSemantics(dok.betrag) === 'credit') {
    return { key: 'check_credit', label: t(lang, 'next_step.credit'), urgency: 'info' };
  }
  if (isLowConfidence(dok)) {
    return { key: 'review', label: t(lang, 'review.label'), urgency: 'warning' };
  }

  const tage = getTageVerbleibend(dok.frist);

  if (tage !== null && tage < 0) {
    return { key: 'overdue', label: t(lang, 'doc.overdue'), urgency: 'critical' };
  }
  if (dok.risiko === 'hoch') {
    return { key: 'urgent', label: t(lang, 'next_step.urgent'), urgency: 'critical' };
  }
  if (tage !== null && tage <= 7) {
    return { key: 'deadline_soon', label: t(lang, 'next_step.deadline_soon'), urgency: 'warning' };
  }
  if (canOfferPaymentAction(dok.betrag) && dok.aktionen?.includes('zahlen')) {
    return { key: 'pay', label: t(lang, 'next_step.pay'), urgency: 'warning' };
  }
  if (dok.aktionen?.includes('einspruch')) {
    return { key: 'einspruch', label: t(lang, 'next_step.objection'), urgency: 'info' };
  }

  return null;
}
