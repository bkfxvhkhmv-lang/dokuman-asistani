import { generateId } from '@/utils/formatters';
import { persistScanFiles } from '@/modules/scanner/storage/scanFileStorage';
import { ocrMvpToV4Document } from '@/features/ocr-mvp/adapters/ocrMvpToV4Document';
import { postAcceptedSnapshot } from '@/services/ocrMvpApi';
import type { ScannedAsset } from '@/features/ocr-mvp/scanner/types';
import type { Dokument } from '@/store';
import { runOcrJobToCompletion } from './runOcrJobToCompletion';

export type BatchQuotaStop = 'quota_ocr' | 'quota_document' | null;

export interface UploadBatchResult {
  saved: number;
  failed: number;
  stoppedByQuota: BatchQuotaStop;
}

export interface ProcessUploadBatchDeps {
  gateOcr: () => Promise<boolean>;
  gateDocument: () => Promise<boolean>;
  getDocuments: () => Dokument[];
  addDocument: (doc: Dokument) => void;
  runOcr?: typeof runOcrJobToCompletion;
}

export interface ProcessUploadBatchCallbacks {
  onProgress?: (current: number, total: number, displayName: string) => void;
}

function findDuplicateByRohText(docs: Dokument[], result: Parameters<typeof ocrMvpToV4Document>[0], docId: string): Dokument | null {
  const draftCheck = ocrMvpToV4Document(result, { id: docId });
  const sig = draftCheck.document.rohText?.slice(0, 120) ?? null;
  if (!sig) return null;
  return docs.find((d) => d.rohText && d.rohText.slice(0, 120) === sig) ?? null;
}

/**
 * Processes each picked file sequentially: OCR job → save as separate Dokument.
 * One file failure does not stop the batch unless quota gates block further work.
 */
export async function processUploadBatch(
  assets: ScannedAsset[],
  deps: ProcessUploadBatchDeps,
  callbacks?: ProcessUploadBatchCallbacks,
): Promise<UploadBatchResult> {
  const runOcr = deps.runOcr ?? runOcrJobToCompletion;
  let saved = 0;
  let failed = 0;
  let stoppedByQuota: BatchQuotaStop = null;
  const total = assets.length;

  for (let index = 0; index < assets.length; index++) {
    const asset = assets[index];
    const displayName = asset.displayName || asset.name;
    callbacks?.onProgress?.(index + 1, total, displayName);

    if (!(await deps.gateOcr())) {
      stoppedByQuota = 'quota_ocr';
      break;
    }

    let docId: string;
    let persistedPages: Awaited<ReturnType<typeof persistScanFiles>>;
    try {
      docId = generateId();
      persistedPages = await persistScanFiles(docId, [asset.uri]);
    } catch {
      failed += 1;
      continue;
    }

    const ocrOutcome = await runOcr(
      { uri: asset.uri, name: asset.name, mimeType: asset.mimeType },
      undefined,
      { sourceType: asset.source, pageCount: asset.pageCount },
    );

    if (!ocrOutcome.ok) {
      failed += 1;
      continue;
    }

    const docs = deps.getDocuments();
    const duplicate = findDuplicateByRohText(docs, ocrOutcome.result, docId);
    if (duplicate) {
      saved += 1;
      continue;
    }

    if (!(await deps.gateDocument())) {
      stoppedByQuota = 'quota_document';
      break;
    }

    try {
      const draft = ocrMvpToV4Document(ocrOutcome.result, {
        id: docId,
        uri: persistedPages[0]?.uri ?? null,
        fileRelativePath: persistedPages[0]?.relativePath ?? null,
        pages: persistedPages,
      });
      deps.addDocument(draft.document);
      saved += 1;

      const doc = draft.document;
      void postAcceptedSnapshot(ocrOutcome.jobId, {
        final_kind: doc.typ ?? null,
        final_language: doc.detectedLanguage ?? ocrOutcome.result.language ?? null,
        final_fields: {
          titel: doc.titel ?? null,
          absender: doc.absender ?? null,
          betrag: doc.betrag ?? null,
          frist: doc.frist ?? null,
          iban: doc.iban ?? null,
          risiko: doc.risiko ?? null,
        },
      }).catch(() => {});
    } catch {
      failed += 1;
    }
  }

  return { saved, failed, stoppedByQuota };
}

export function buildBatchSummaryMessage(
  result: UploadBatchResult,
  format: (key: string, params?: Record<string, string | number>) => string,
): string {
  const { saved, failed, stoppedByQuota } = result;

  if (stoppedByQuota === 'quota_ocr' || stoppedByQuota === 'quota_document') {
    const base =
      failed === 0
        ? format('ocr.upload.batch_summary_ok', { n: saved })
        : format('ocr.upload.batch_summary_partial', { saved, failed });
    return `${base}\n${format('ocr.upload.batch_summary_quota_stopped')}`;
  }

  if (failed === 0) {
    return format('ocr.upload.batch_summary_ok', { n: saved });
  }
  return format('ocr.upload.batch_summary_partial', { saved, failed });
}
