jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('../hooks/useLangPreference', () => ({
  getLang: jest.fn(async () => 'tr'),
}));

// archiveDocument iceride dosya sistemine yaziyor — testlerde mock'lariz.
// (Jest factory hoist sinirlamasi nedeniyle mock prefix'li bir isim kullaniyoruz.)
const mockArchiveDocument = jest.fn((_opts: any) => Promise.resolve({
  dokId:    'mock-dok-id',
  pages:    [{ id: 'p1', uri: 'file:///doc/page-1.jpg', order: 1, rotation: 0 }],
  document: { id: 'mock-dok-id' } as any,
}));
jest.mock('../modules/scanner/flow/archiveDocument', () => ({
  archiveDocument: (opts: any) => mockArchiveDocument(opts),
}));

import { executeScanAction } from '@/modules/scanner/flow/scanActions';

describe('executeScanAction', () => {
  const baseDeps = () => {
    const showSheet = jest.fn();
    const hideSheet = jest.fn();
    const runDiagnose = jest.fn();
    const clearPages = jest.fn();
    const onCloseFlow = jest.fn();
    const onArchived = jest.fn();
    const dispatch = jest.fn();
    return {
      action:      'diagnose' as const,
      pageCount:   2,
      sourceUris:  ['file:///cache/p1.jpg', 'file:///cache/p2.jpg'],
      runDiagnose,
      clearPages,
      onCloseFlow,
      onArchived,
      showSheet,
      hideSheet,
      generatePdf: jest.fn(async () => ({ uri: 'file://test.pdf', pageCount: 2, fileSize: 1024 })),
      dispatch,
      refs: { showSheet, hideSheet, runDiagnose, clearPages, onCloseFlow, onArchived, dispatch },
    };
  };

  beforeEach(() => {
    mockArchiveDocument.mockClear();
  });

  it('runs diagnose pipeline for diagnose action', async () => {
    const deps = baseDeps();
    await executeScanAction(deps);
    expect(deps.refs.runDiagnose).toHaveBeenCalledTimes(1);
    expect(mockArchiveDocument).not.toHaveBeenCalled();
  });

  it('archive action persists document and shows confirmation sheet', async () => {
    const deps = baseDeps();
    await executeScanAction({ ...deps, action: 'archive' });
    expect(mockArchiveDocument).toHaveBeenCalledTimes(1);
    expect(deps.refs.showSheet).toHaveBeenCalledTimes(1);
    const cfg = deps.refs.showSheet.mock.calls[0][0];
    expect(cfg.title).toBe('Arsive kaydedildi');
    expect(cfg.actions).toHaveLength(1);

    // Sheet'in OK butonuna basildiginda onArchived calismali
    cfg.actions[0].onPress();
    expect(deps.refs.hideSheet).toHaveBeenCalled();
    expect(deps.refs.clearPages).toHaveBeenCalled();
    expect(deps.refs.onArchived).toHaveBeenCalledWith('mock-dok-id');
  });

  it('export action saves first, then shares pdf', async () => {
    const deps = baseDeps();
    await executeScanAction({ ...deps, action: 'export' });
    // Onemli: paylasimdan once arsive yazildi
    expect(mockArchiveDocument).toHaveBeenCalledTimes(1);
    // generatePdf de cagrildi
    expect(deps.generatePdf).toHaveBeenCalled();
    // Akis sonunda onArchived ile detail'e yonlendirildi
    expect(deps.refs.onArchived).toHaveBeenCalledWith('mock-dok-id');
  });

  it('export action: when pdf fails the doc is still saved', async () => {
    const deps = baseDeps();
    await executeScanAction({
      ...deps,
      action: 'export',
      generatePdf: jest.fn(async () => null),
    });
    // Belge KAYBOLMAMALI — once arsive yazildi
    expect(mockArchiveDocument).toHaveBeenCalledTimes(1);

    // PDF olusturulamadi sheet'i gosterildi
    const calls = deps.refs.showSheet.mock.calls.map((c: any[]) => c[0]);
    const lastSheet = calls[calls.length - 1];
    expect(lastSheet.tone).toBe('warning');

    // Kullanici OK derse onArchived cagrilir
    lastSheet.actions[0].onPress();
    expect(deps.refs.onArchived).toHaveBeenCalledWith('mock-dok-id');
  });

  it('archive action: when persistence fails, shows error and does NOT call onArchived', async () => {
    mockArchiveDocument.mockRejectedValueOnce(new Error('disk full'));
    const deps = baseDeps();
    await executeScanAction({ ...deps, action: 'archive' });
    expect(mockArchiveDocument).toHaveBeenCalledTimes(1);
    // Hata sheet'i gosterilmeli
    const calls = deps.refs.showSheet.mock.calls.map((c: any[]) => c[0]);
    const lastSheet = calls[calls.length - 1];
    expect(lastSheet.tone).toBe('danger');
    expect(deps.refs.onArchived).not.toHaveBeenCalled();
  });
});
