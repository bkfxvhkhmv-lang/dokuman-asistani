/**
 * archiveDocument — OCR yapmadan kalici belge kaydetme testi.
 *
 * persistScanFiles mock'lanir; sadece dispatch payload'unun
 * Dokument tipinin gerektigi sekilde dogru oldugunu kontrol ederiz.
 */

const mockPersistScanFiles = jest.fn(async (dokId: string, sources: string[]) =>
  sources.map((src, i) => ({
    id:        `p-${i}`,
    uri:       `file:///doc/scans/${dokId}/page-${i + 1}.jpg`,
    order:     i + 1,
    rotation:  0 as const,
    createdAt: '2026-04-28T18:00:00.000Z',
  })),
);

jest.mock('../modules/scanner/storage/scanFileStorage', () => ({
  persistScanFiles: (dokId: string, sources: string[]) => mockPersistScanFiles(dokId, sources),
}));

import { archiveDocument } from '@/modules/scanner/flow/archiveDocument';

beforeEach(() => mockPersistScanFiles.mockClear());

describe('archiveDocument', () => {
  it('throws when no source uris provided', async () => {
    const dispatch = jest.fn();
    await expect(
      archiveDocument({ sourceUris: [], dispatch }),
    ).rejects.toThrow();
  });

  it('persists pages, dispatches ADD_DOKUMENT with minimal Dokument shape', async () => {
    const dispatch = jest.fn();
    const result = await archiveDocument({
      sourceUris: ['file:///cache/a.jpg', 'file:///cache/b.jpg'],
      dispatch,
    });

    // persist cagrildi
    expect(mockPersistScanFiles).toHaveBeenCalledTimes(1);
    const [calledDokId, calledSources] = mockPersistScanFiles.mock.calls[0];
    expect(calledDokId).toBeTruthy();
    expect(calledSources).toEqual(['file:///cache/a.jpg', 'file:///cache/b.jpg']);

    // dispatch ADD_DOKUMENT payload dogru sekilde olusturuldu
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('ADD_DOKUMENT');
    const dok = action.payload;
    expect(dok.id).toBe(result.dokId);
    expect(dok.typ).toBe('Sonstiges');
    expect(dok.absender).toBe('Unbekannt');
    expect(dok.gelesen).toBe(true); // arsivleyen kullanici, zaten gormus
    expect(dok.archiveBehavior).toBe('manual');
    expect(dok.pages).toHaveLength(2);
    expect(dok.pages[0].order).toBe(1);
    expect(dok.uri).toBe('file:///doc/scans/' + result.dokId + '/page-1.jpg');
    expect(dok.titel).toMatch(/^Scan vom /);
    expect(dok.rohText).toBeNull();
  });

  it('honors customTitle when provided', async () => {
    const dispatch = jest.fn();
    const { document } = await archiveDocument({
      sourceUris: ['file:///cache/a.jpg'],
      customTitle: 'Versicherungsbescheinigung 2026',
      dispatch,
    });
    expect(document.titel).toBe('Versicherungsbescheinigung 2026');
    expect(document.customTitle).toBe('Versicherungsbescheinigung 2026');
  });

  it('honors typ override', async () => {
    const dispatch = jest.fn();
    const { document } = await archiveDocument({
      sourceUris: ['file:///cache/a.jpg'],
      typ: 'Rechnung',
      dispatch,
    });
    expect(document.typ).toBe('Rechnung');
  });
});
