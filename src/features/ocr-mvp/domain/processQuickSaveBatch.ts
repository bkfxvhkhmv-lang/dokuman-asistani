import type { ScannedAsset } from '@/features/ocr-mvp/scanner/types';
import type { Dokument } from '@/store';
import {
  buildDraftDocument,
  findDuplicateImportByFileSize,
  persistImportSource,
} from './saveImportDraft';

export type QuickSaveQuotaStop = 'quota_document' | null;

export interface QuickSaveBatchResult {
  saved: number;
  failed: number;
  stoppedByQuota: QuickSaveQuotaStop;
}

export interface ProcessQuickSaveBatchDeps {
  gateDocument: () => Promise<boolean>;
  getDocuments: () => Dokument[];
  addDocument: (doc: Dokument) => void;
}

export interface ProcessQuickSaveBatchCallbacks {
  onProgress?: (current: number, total: number, displayName: string) => void;
}

/** Saves each picked file as a separate Dokument — no OCR, AI, or backend calls. */
export async function processQuickSaveBatch(
  assets: ScannedAsset[],
  deps: ProcessQuickSaveBatchDeps,
  callbacks?: ProcessQuickSaveBatchCallbacks,
): Promise<QuickSaveBatchResult> {
  let saved = 0;
  let failed = 0;
  let stoppedByQuota: QuickSaveQuotaStop = null;
  const total = assets.length;

  for (let index = 0; index < assets.length; index++) {
    const asset = assets[index];
    const displayName = asset.displayName || asset.name;
    callbacks?.onProgress?.(index + 1, total, displayName);

    if (!(await deps.gateDocument())) {
      stoppedByQuota = 'quota_document';
      break;
    }

    try {
      const persisted = await persistImportSource(null, asset.uri);
      const docs = deps.getDocuments();
      const duplicate = await findDuplicateImportByFileSize(docs, persisted.pages);
      if (duplicate) {
        saved += 1;
        continue;
      }

      const doc = buildDraftDocument(
        persisted.docId,
        persisted.pages,
        asset.name ?? null,
        asset.uri,
      );
      deps.addDocument(doc);
      saved += 1;
    } catch {
      failed += 1;
    }
  }

  return { saved, failed, stoppedByQuota };
}

export function buildQuickSaveSummaryMessage(
  result: QuickSaveBatchResult,
  format: (key: string, params?: Record<string, string | number>) => string,
): string {
  const { saved, failed, stoppedByQuota } = result;

  if (stoppedByQuota === 'quota_document') {
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
