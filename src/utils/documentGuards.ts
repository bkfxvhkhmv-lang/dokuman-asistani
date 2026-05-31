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

/**
 * True when OCR confidence is too low to trust extracted fields.
 * Uses 0-100 scale (matching app-wide convention); null/undefined → high confidence.
 */
export function isLowConfidence(dok: { confidence?: number | null }): boolean {
  return (dok.confidence ?? 100) < 55;
}

/**
 * True when the document has a usable payment target (IBAN).
 * Guards "Zahlung vorbereiten" — showing that button without a recipient/IBAN is unsafe.
 */
export function hasPaymentTarget(dok: { iban?: string | null }): boolean {
  return !!(dok.iban?.trim());
}

function matchesType(dok: { typ?: string | null }, pattern: RegExp): boolean {
  return pattern.test((dok.typ ?? '').toLowerCase());
}

function isUnknownLike(value: string | null | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return !v || v === 'unbekannt' || v === 'unbekannter absender' || v === 'unknown';
}

function hasUsefulType(dok: { typ?: string | null }): boolean {
  const typ = (dok.typ ?? '').trim().toLowerCase();
  if (!typ) return false;
  return !/^(dokument|sonstiges|unbekannt)$/i.test(typ);
}

function hasUsefulTitle(dok: { titel?: string | null }): boolean {
  const titel = (dok.titel ?? '').trim();
  if (!titel) return false;
  return !/^(dokument|unbekanntes dokument|scan[_\s-]?\d+)/i.test(titel);
}

function hasUsefulIdentity(dok: { typ?: string | null; titel?: string | null; absender?: string | null }): boolean {
  return hasUsefulType(dok) || hasUsefulTitle(dok) || !isUnknownLike(dok.absender);
}

export type ManualReviewReason =
  | 'low_confidence'
  | 'missing_amount_for_payment_doc'
  | 'missing_deadline_for_urgent_doc'
  | 'empty_identity_and_no_useful_fields';

export function getReviewIssues(dok: {
  typ?: string | null;
  titel?: string | null;
  absender?: string | null;
  betrag?: number | null;
  frist?: string | null;
}): Array<'sender' | 'amount' | 'deadline'> {
  const issues: Array<'sender' | 'amount' | 'deadline'> = [];
  const invoiceLike = matchesType(dok, /rechnung|mahnung|bußgeld|bussgeld|steuer|beitrag/);
  const deadlineSensitive = matchesType(dok, /mahnung|bußgeld|bussgeld|steuer|kündigung|kuendigung/);

  if (!dok.absender && !hasUsefulIdentity(dok)) issues.push('sender');
  if (invoiceLike && dok.betrag == null) issues.push('amount');
  if (deadlineSensitive && !dok.frist) issues.push('deadline');

  return issues;
}

export function getManualReviewReasons(dok: {
  id?: string | null;
  typ?: string | null;
  titel?: string | null;
  absender?: string | null;
  betrag?: number | null;
  frist?: string | null;
  confidence?: number | null;
  erledigt?: boolean;
}): ManualReviewReason[] {
  if (dok.erledigt) return [];

  const reasons: ManualReviewReason[] = [];
  const confidence = dok.confidence ?? 100;
  if (confidence < 30) reasons.push('low_confidence');

  const issues = getReviewIssues(dok);
  if (issues.includes('amount')) reasons.push('missing_amount_for_payment_doc');
  if (issues.includes('deadline')) reasons.push('missing_deadline_for_urgent_doc');

  const identityMissing = !hasUsefulIdentity(dok);
  const hasAnyUsefulExtraction = !isUnknownLike(dok.absender) || dok.betrag != null || !!dok.frist;
  if (identityMissing && !hasAnyUsefulExtraction) reasons.push('empty_identity_and_no_useful_fields');

  return reasons;
}

export function needsManualReview(dok: {
  typ?: string | null;
  titel?: string | null;
  absender?: string | null;
  betrag?: number | null;
  frist?: string | null;
  confidence?: number | null;
  erledigt?: boolean;
}): boolean {
  return getManualReviewReasons(dok).length > 0;
}

export function getReviewLabel(dok: {
  typ?: string | null;
  titel?: string | null;
  absender?: string | null;
  betrag?: number | null;
  frist?: string | null;
  confidence?: number | null;
  erledigt?: boolean;
}): string | null {
  if (!needsManualReview(dok)) return null;
  const issues = getReviewIssues(dok);
  if (issues.length > 1 || (dok.confidence ?? 100) < 30) return 'Einige Angaben prüfen';
  return 'Angaben prüfen';
}
