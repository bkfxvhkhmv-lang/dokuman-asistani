/**
 * AI Labeler Service — Document display name fallback via the core-api backend.
 *
 * Architecture:
 *   Rules first (deterministic) → backend worker result fallback only for weak/generic results.
 *
 * Hard rules:
 *   - Only called when shouldLabel() returns true.
 *   - Never overwrites a strong, specific deterministic result.
 *   - Result is cached via aiLabelledAt — one user-accepted label per document lifetime.
 *   - Confidence < 70 → usable = false (requires user confirmation).
 *   - No automatic UI mutation in this module — callers decide how to apply.
 *   - No call during list rendering.
 */

import type { Dokument } from '@/store/types';
import { isWeakSender } from '@/utils/senderNormalization';
import type { AiLabelResponse } from '@/utils/aiLabelSchema';
import { getDocumentWorkerResult } from '@/services/v4-api/documents';
import type { BackendWorkerResult } from '@/services/v4-api/types';

// ── Trigger guard ─────────────────────────────────────────────────────────────

const WEAK_TYPES = new Set([
  'formular', 'sonstiges', 'unbekannt', 'unknown', 'dokument', '',
]);

const GENERIC_TITLE_RE =
  /^(dokument|formular|unbekanntes dokument|scan[\s_]\d*|neues dokument|sonstiges|analysiertes dokument|bild ausgewählt|foto aufgenommen)$/i;

type LabelCandidate = Pick<Dokument,
  | 'typ' | 'absender' | 'titel' | 'rohText' | 'id'
  | 'aiLabelledAt' | 'confidence'
>;

/**
 * Returns true when the document has weak/generic classification and
 * the AI Labeler should be triggered.
 *
 * Guard conditions that prevent calling:
 *  - aiLabelledAt is set (already labelled — cache hit)
 *  - rohText is empty (no OCR text to analyse)
 *  - id is missing (should never happen for a stored document)
 */
export function shouldLabel(dok: Partial<LabelCandidate>): boolean {
  if (dok.aiLabelledAt) return false;
  if (!dok.rohText?.trim()) return false;

  const typeIsWeak = WEAK_TYPES.has((dok.typ ?? '').trim().toLowerCase());
  const senderIsWeak = isWeakSender(dok.absender);
  const titleIsGeneric = !dok.titel || GENERIC_TITLE_RE.test(dok.titel.trim());

  return typeIsWeak || senderIsWeak || titleIsGeneric;
}

// ── Backend result mapper ─────────────────────────────────────────────────────

export interface AiLabelerResult {
  response: AiLabelResponse;
  /** True when confidence >= 70 and needsUserConfirmation is false. */
  usable: boolean;
}

const MAX_TITLE = 120;
const MAX_TYPE = 80;
const MAX_SENDER = 80;
const MAX_SHORT_SUMMARY = 300;

function normalizeConfidence(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  // Backend stores PaddleOCR confidence as 0–1; legacy/UI expects 0–100.
  const scaled = raw <= 1 ? raw * 100 : raw;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

/**
 * Converts the canonical backend worker result into the AI Labeler suggestion
 * shape used by the "Besser erkennen" card.
 *
 * Returns null when no usable title/type is present.
 */
export function labelDocumentFromBackendResult(
  result: BackendWorkerResult,
): AiLabelerResult | null {
  const doc = result.document;
  if (!doc) return null;

  const displayTitle = truncate(doc.suggested_title?.trim() ?? '', MAX_TITLE);
  const documentType = truncate(doc.document_type?.trim() ?? '', MAX_TYPE);
  if (!displayTitle || !documentType) return null;

  const confidence = normalizeConfidence(result.confidence);
  const rawSender = doc.sender?.trim() ?? '';
  const sender = rawSender ? truncate(rawSender, MAX_SENDER) : null;
  const shortSummary = truncate(
    result.action_summary?.short_summary?.trim() ||
    result.action_summary?.summary?.trim() ||
    '',
    MAX_SHORT_SUMMARY,
  );

  const response: AiLabelResponse = {
    displayTitle,
    documentType,
    sender,
    shortSummary,
    confidence,
    needsUserConfirmation: confidence < 70,
    reason: '',
  };

  return {
    response,
    usable: !response.needsUserConfirmation,
  };
}

/**
 * Fetches `GET /documents/{remoteDocId}/result` and maps it to an AI Labeler
 * suggestion, or null on any failure.
 */
export async function fetchBackendLabel(remoteDocId: string): Promise<AiLabelerResult | null> {
  try {
    const result = await getDocumentWorkerResult(remoteDocId);
    return labelDocumentFromBackendResult(result);
  } catch {
    return null;
  }
}
