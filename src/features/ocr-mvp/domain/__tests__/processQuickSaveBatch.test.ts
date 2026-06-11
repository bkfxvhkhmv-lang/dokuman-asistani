import type { ScannedAsset } from '@/features/ocr-mvp/scanner/types';
import type { Dokument } from '@/store';
import {
  buildQuickSaveSummaryMessage,
  processQuickSaveBatch,
} from '@/features/ocr-mvp/domain/processQuickSaveBatch';

jest.mock('@/features/ocr-mvp/domain/saveImportDraft', () => ({
  persistImportSource: jest.fn(async (_id: string | null, uri: string) => ({
    docId: `doc-${uri}`,
    pages: [{ uri: `persisted://${uri}`, relativePath: `doc/page-0`, sourceUri: uri }],
  })),
  findDuplicateImportByFileSize: jest.fn(async () => null),
  buildDraftDocument: jest.fn((docId: string, pages: unknown[], fileName: string | null) => ({
    id: docId,
    titel: fileName ?? 'Dokument',
    typ: 'Sonstiges',
    absender: 'Unbekannt',
    pages,
  })),
}));

import { persistImportSource } from '@/features/ocr-mvp/domain/saveImportDraft';

function makeAsset(name: string): ScannedAsset {
  return {
    uri: `file:///${name}`,
    name,
    mimeType: 'application/pdf',
    source: 'file',
    displayName: name,
  };
}

describe('processQuickSaveBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves files sequentially without OCR', async () => {
    const order: string[] = [];
    const added: string[] = [];

    const result = await processQuickSaveBatch(
      [makeAsset('a.pdf'), makeAsset('b.pdf')],
      {
        gateDocument: async () => {
          order.push('gate');
          return true;
        },
        getDocuments: () => [],
        addDocument: (doc: Dokument) => { added.push(doc.id); },
      },
    );

    expect(result).toEqual({ saved: 2, failed: 0, stoppedByQuota: null });
    expect(persistImportSource).toHaveBeenCalledTimes(2);
    expect(added).toHaveLength(2);
  });

  it('continues after a persist failure', async () => {
    (persistImportSource as jest.Mock)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({
        docId: 'doc-ok',
        pages: [{ uri: 'persisted://ok', relativePath: 'ok/page-0', sourceUri: 'file:///ok.pdf' }],
      });

    const result = await processQuickSaveBatch(
      [makeAsset('fail.pdf'), makeAsset('ok.pdf')],
      {
        gateDocument: async () => true,
        getDocuments: () => [],
        addDocument: jest.fn(),
      },
    );

    expect(result).toEqual({ saved: 1, failed: 1, stoppedByQuota: null });
  });

  it('stops when document quota gate fails', async () => {
    let gateCalls = 0;

    const result = await processQuickSaveBatch(
      [makeAsset('a.pdf'), makeAsset('b.pdf')],
      {
        gateDocument: async () => {
          gateCalls += 1;
          return gateCalls === 1;
        },
        getDocuments: () => [],
        addDocument: jest.fn(),
      },
    );

    expect(result).toEqual({ saved: 1, failed: 0, stoppedByQuota: 'quota_document' });
    expect(persistImportSource).toHaveBeenCalledTimes(1);
  });
});

describe('buildQuickSaveSummaryMessage', () => {
  const format = (key: string, params?: Record<string, string | number>) =>
    `${key}:${JSON.stringify(params ?? {})}`;

  it('builds success-only summary', () => {
    expect(buildQuickSaveSummaryMessage({ saved: 3, failed: 0, stoppedByQuota: null }, format))
      .toBe('ocr.upload.batch_summary_ok:{"n":3}');
  });

  it('builds partial failure summary', () => {
    expect(buildQuickSaveSummaryMessage({ saved: 2, failed: 1, stoppedByQuota: null }, format))
      .toBe('ocr.upload.batch_summary_partial:{"saved":2,"failed":1}');
  });
});
