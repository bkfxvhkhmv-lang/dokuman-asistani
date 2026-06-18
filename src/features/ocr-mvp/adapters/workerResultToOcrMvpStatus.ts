import type { BackendWorkerResult } from '@/services/v4-api/types';
import type { OcrMvpActionSummary, OcrMvpJobStatus } from '@/services/ocrMvpApi';

/** Poll interval while waiting for decision_worker to populate document_meta. */
export const WORKER_RESULT_META_RETRY_MS = 1_500;
/** Max extra /result fetches after OCR completed before accepting OCR-only snapshot. */
export const WORKER_RESULT_META_RETRY_MAX = 4;

/**
 * True when backend enrichment (document_meta → /result) looks ready.
 * OCR-only snapshots have raw_text but empty AI fields.
 */
export function hasWorkerResultAiMeta(wr: BackendWorkerResult): boolean {
  const doc = wr.document;
  const as = wr.action_summary;
  if (doc?.suggested_title?.trim()) return true;
  if (doc?.document_type?.trim()) return true;
  if (as?.summary?.trim()) return true;
  if (as?.short_summary?.trim()) return true;
  if (as?.next_action?.trim()) return true;
  return false;
}

function mapActionSummary(wr: BackendWorkerResult): OcrMvpActionSummary | undefined {
  const as = wr.action_summary;
  const doc = wr.document;
  if (!as && !doc) return undefined;

  const sender = doc?.sender?.trim() || undefined;
  const deadline = as?.deadline?.trim() || doc?.deadline?.trim() || undefined;
  const docDate = doc?.date?.trim() || undefined;
  const suggestedTitle = doc?.suggested_title?.trim() || undefined;

  return {
    kind: as?.kind?.trim() || doc?.document_type?.trim() || undefined,
    title: suggestedTitle,
    summary: as?.summary?.trim() || undefined,
    vendor_name: sender,
    sender,
    document_date: docDate,
    invoice_date: docDate,
    deadline,
    due_date: deadline,
    amount: as?.amount ?? doc?.amount ?? undefined,
    currency: doc?.currency?.trim() || undefined,
    raw_text: doc?.raw_text?.trim() || undefined,
    warnings: as?.warnings ?? [],
    recommended_actions: as?.recommended_actions ?? [],
    iban: wr.meta?.iban?.trim() || undefined,
  };
}

/**
 * Maps core API worker result (GET /documents/{id}/result) to the legacy
 * OcrMvpJobStatus shape consumed by OcrMvpScreen / ocrMvpToV4Document.
 */
export function workerResultToOcrMvpStatus(
  wr: BackendWorkerResult,
  remoteDocId?: string,
): OcrMvpJobStatus {
  const failed = wr.status === 'failed';
  const completed = wr.status === 'completed';
  const docType = wr.document?.document_type?.trim() || wr.action_summary?.kind?.trim() || undefined;
  const warnings = wr.action_summary?.warnings ?? [];

  return {
    job_id: wr.job_id?.trim() || remoteDocId || '',
    status: failed ? 'error' : completed ? 'done' : 'processing',
    document_type: docType,
    language: wr.language?.trim() || undefined,
    confidence: wr.confidence ?? undefined,
    provider: wr.meta?.provider?.trim() || undefined,
    needs_review: warnings.length > 0,
    action_summary: mapActionSummary(wr),
    error: wr.error?.trim() || undefined,
  };
}
