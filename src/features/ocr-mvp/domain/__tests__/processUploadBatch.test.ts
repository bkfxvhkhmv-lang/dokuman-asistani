import type { ScannedAsset } from '@/features/ocr-mvp/scanner/types';
import type { Dokument } from '@/store';
import {
  buildBatchSummaryMessage,
  processUploadBatch,
} from '@/features/ocr-mvp/domain/processUploadBatch';

jest.mock('@/modules/scanner/storage/scanFileStorage', () => ({
  persistScanFiles: jest.fn(async (docId: string, uris: string[]) => [
    { uri: `persisted://${docId}`, relativePath: `${docId}/page-0`, sourceUri: uris[0] },
  ]),
}));

jest.mock('@/features/ocr-mvp/adapters/ocrMvpToV4Document', () => ({
  ocrMvpToV4Document: jest.fn((result: { job_id: string }, opts: { id: string }) => ({
    document: {
      id: opts.id,
      titel: `Doc ${result.job_id}`,
      typ: 'Sonstiges',
      absender: 'Test',
      rohText: `text-${result.job_id}`,
    },
  })),
}));

import { persistScanFiles } from '@/modules/scanner/storage/scanFileStorage';

function makeAsset(name: string): ScannedAsset {
  return {
    uri: `file:///${name}`,
    name,
    mimeType: 'application/pdf',
    source: 'file',
    displayName: name,
  };
}

const doneResult = (jobId: string) => ({
  ok: true as const,
  jobId,
  result: {
    job_id: jobId,
    status: 'done' as const,
    action_summary: { kind: 'invoice' },
  },
});

describe('processUploadBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes files sequentially and saves each successful OCR result', async () => {
    const order: string[] = [];
    const runOcr = jest.fn(async (file: { name?: string }) => {
      order.push(file.name ?? '');
      return doneResult(`job-${file.name}`);
    });

    const added: string[] = [];
    const result = await processUploadBatch(
      [makeAsset('a.pdf'), makeAsset('b.pdf')],
      {
        gateOcr: async () => true,
        gateDocument: async () => true,
        getDocuments: () => [],
        addDocument: (doc: Dokument) => { added.push(doc.id); },
        runOcr,
      },
    );

    expect(result).toEqual({ saved: 2, failed: 0, stoppedByQuota: null });
    expect(runOcr).toHaveBeenCalledTimes(2);
    expect(order).toEqual(['a.pdf', 'b.pdf']);
    expect(added).toHaveLength(2);
    expect(persistScanFiles).toHaveBeenCalledTimes(2);
  });

  it('continues after a non-fatal OCR failure', async () => {
    const runOcr = jest.fn()
      .mockResolvedValueOnce({ ok: false, error: 'network' })
      .mockResolvedValueOnce(doneResult('job-ok'));

    const result = await processUploadBatch(
      [makeAsset('fail.pdf'), makeAsset('ok.pdf')],
      {
        gateOcr: async () => true,
        gateDocument: async () => true,
        getDocuments: () => [],
        addDocument: jest.fn(),
        runOcr,
      },
    );

    expect(result).toEqual({ saved: 1, failed: 1, stoppedByQuota: null });
    expect(runOcr).toHaveBeenCalledTimes(2);
  });

  it('stops remaining files when OCR quota gate fails', async () => {
    const runOcr = jest.fn(async () => doneResult('job-1'));
    let gateCalls = 0;

    const result = await processUploadBatch(
      [makeAsset('a.pdf'), makeAsset('b.pdf'), makeAsset('c.pdf')],
      {
        gateOcr: async () => {
          gateCalls += 1;
          return gateCalls === 1;
        },
        gateDocument: async () => true,
        getDocuments: () => [],
        addDocument: jest.fn(),
        runOcr,
      },
    );

    expect(result).toEqual({ saved: 1, failed: 0, stoppedByQuota: 'quota_ocr' });
    expect(runOcr).toHaveBeenCalledTimes(1);
  });
});

describe('buildBatchSummaryMessage', () => {
  const format = (key: string, params?: Record<string, string | number>) =>
    `${key}:${JSON.stringify(params ?? {})}`;

  it('builds success-only summary', () => {
    expect(buildBatchSummaryMessage({ saved: 3, failed: 0, stoppedByQuota: null }, format))
      .toBe('ocr.upload.batch_summary_ok:{"n":3}');
  });

  it('builds partial failure summary', () => {
    expect(buildBatchSummaryMessage({ saved: 3, failed: 1, stoppedByQuota: null }, format))
      .toBe('ocr.upload.batch_summary_partial:{"saved":3,"failed":1}');
  });
});
