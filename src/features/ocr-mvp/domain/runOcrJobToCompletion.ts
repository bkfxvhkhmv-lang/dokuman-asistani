import { analyzeDocument, getOcrResult } from '@/services/ocrMvpApi';
import type { OcrMvpFile, OcrMvpForceType, OcrMvpJobStatus } from '@/services/ocrMvpApi';

const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 90_000;
const UPLOAD_TIMEOUT_MS = 20_000;

export type OcrJobCompletionResult =
  | { ok: true; result: OcrMvpJobStatus; jobId: string }
  | { ok: false; error: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs one OCR upload + poll loop to completion without React hook state.
 * Used for sequential multi-file batch processing.
 */
export async function runOcrJobToCompletion(
  file: OcrMvpFile,
  forceType?: OcrMvpForceType,
  meta?: { sourceType?: string; pageCount?: number },
): Promise<OcrJobCompletionResult> {
  const abortCtrl = new AbortController();
  const uploadTimer = setTimeout(() => abortCtrl.abort(), UPLOAD_TIMEOUT_MS);

  let jobId: string;
  try {
    const response = await analyzeDocument(file, forceType, abortCtrl.signal, meta);
    clearTimeout(uploadTimer);
    jobId = response.job_id;
  } catch (e) {
    clearTimeout(uploadTimer);
    const message = e instanceof Error ? e.message : 'Upload failed';
    return { ok: false, error: message };
  }

  const started = Date.now();

  const pollOnce = async (): Promise<OcrJobCompletionResult | null> => {
    try {
      const data = await getOcrResult(jobId);
      if (data.status === 'done') {
        return { ok: true, result: data, jobId };
      }
      if (data.status === 'error') {
        return { ok: false, error: data.error ?? 'OCR error' };
      }
      return null;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return null;
      }
      return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  };

  const first = await pollOnce();
  if (first) return first;

  while (Date.now() - started < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const next = await pollOnce();
    if (next) return next;
  }

  return { ok: false, error: 'timeout' };
}
