import type { AmountSemantics } from '@/types/normalizedDocument';
export type { AmountSemantics } from '@/types/normalizedDocument';

/**
 * Central domain guard functions for document field identity.
 *
 * These encode the invariants that prevent OCR noise from corrupting
 * critical document fields:
 *   - Room numbers / reference IDs are not monetary amounts
 *   - Bank/payment details are not the document sender
 *   - Negative amounts are credits, not payables
 *
 * Current production wiring:
 *   - ActionsPanel.tsx  → canOfferPaymentAction, inferAmountSemantics
 *
 * Pending wiring (#N3+):
 *   - ocrMvpToV4Document → inferAmountSemantics
 *   - OCR extraction     → isAmountCandidate, isSenderCandidate
 *
 * Note: groupDocumentFields.ts uses separate HIDDEN_NORMS / ZAHLUNG_NORMS
 * sets for display-grouping purposes — those sets answer "should this field
 * be visible and where?" which is a different question from the guards here.
 */

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/[\s.\-_/()]/g, '');
}

// Labels whose values should never be interpreted as a monetary amount.
// e.g. "Zimmer: 1.24" — the room number must not become dok.betrag.
const AMOUNT_NON_CANDIDATE_NORMS = new Set([
  'zimmer', 'raum',
  'aktenzeichen', 'kundennummer', 'kundennr', 'vertragsnummer', 'vertragsnr',
  'bankname', 'kreditinstitut', 'iban', 'bic', 'kontonummer', 'blz', 'kontoinhaber',
  'zahlungsempfanger', 'empfanger',
]);

// Labels that identify payment/banking infrastructure — never the institutional sender.
// e.g. "Bankname: Kreissparkasse" must not become dok.absender.
const SENDER_NON_CANDIDATE_NORMS = new Set([
  'bankname', 'bank', 'kreditinstitut', 'kontoinhaber',
  'zahlungsempfanger', 'iban', 'bic', 'kontonummer', 'blz',
]);

/**
 * Returns false when a field label is structurally incapable of holding
 * a monetary amount (e.g. room numbers, reference IDs, banking labels).
 */
export function isAmountCandidate(label: string, _value?: string): boolean {
  return !AMOUNT_NON_CANDIDATE_NORMS.has(norm(label));
}

/**
 * Returns false when a field label refers to payment infrastructure
 * (bank name, IBAN, SWIFT/BIC, account holder) rather than the document's
 * issuing institution.
 */
export function isSenderCandidate(
  label: string,
  _value?: string,
  _context?: { documentType?: string },
): boolean {
  return !SENDER_NON_CANDIDATE_NORMS.has(norm(label));
}

/**
 * Classifies a numeric amount by its payment direction.
 *   null/undefined → 'unknown'
 *   < 0            → 'credit'   (Gutschrift, Rückerstattung)
 *   > 0            → 'payable'
 *   === 0          → 'unknown'  (zero amounts are ambiguous)
 */
export function inferAmountSemantics(amount: number | null | undefined): AmountSemantics {
  if (amount == null) return 'unknown';
  if (amount < 0)    return 'credit';
  if (amount > 0)    return 'payable';
  return 'unknown';
}

/**
 * True only when a payment action (Zahlung vorbereiten) is appropriate.
 * Requires a strictly positive amount — credits and nulls return false.
 */
export function canOfferPaymentAction(amount: number | null | undefined): boolean {
  return inferAmountSemantics(amount) === 'payable';
}
