import type { Dokument } from '@/store';
import { inferAmountSemantics, canOfferPaymentAction, isLowConfidence } from '@/utils/documentGuards';
import { getTageVerbleibend } from '@/utils/formatters';

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
  if (dok.erledigt) return null;

  if (inferAmountSemantics(dok.betrag) === 'credit') {
    return { key: 'check_credit', label: 'Gutschrift prüfen', urgency: 'info' };
  }
  if (isLowConfidence(dok)) {
    return { key: 'review', label: 'Angaben prüfen', urgency: 'warning' };
  }

  const tage = getTageVerbleibend(dok.frist);

  if (tage !== null && tage < 0) {
    return { key: 'overdue', label: 'Überfällig', urgency: 'critical' };
  }
  if (dok.risiko === 'hoch') {
    return { key: 'urgent', label: 'Dringend prüfen', urgency: 'critical' };
  }
  if (tage !== null && tage <= 7) {
    return { key: 'deadline_soon', label: 'Frist diese Woche', urgency: 'warning' };
  }
  if (canOfferPaymentAction(dok.betrag) && dok.aktionen?.includes('zahlen')) {
    return { key: 'pay', label: 'Zahlung ausstehend', urgency: 'warning' };
  }
  if (dok.aktionen?.includes('einspruch')) {
    return { key: 'einspruch', label: 'Einspruch möglich', urgency: 'info' };
  }

  return null;
}
