/**
 * scanFileStorage — kalici dosya saklama unit testleri.
 *
 * expo-file-system/legacy mock'lanir: gercek diske yazmadan,
 * cagri sirasi ve hedef yollar dogrulanir.
 */

const mockMakeDirectoryAsync = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockCopyAsync          = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockGetInfoAsync       = jest.fn((..._a: any[]) => Promise.resolve({ exists: false } as { exists: boolean }));
const mockDeleteAsync        = jest.fn((..._a: any[]) => Promise.resolve(undefined));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  cacheDirectory:    'file:///cache/',
  makeDirectoryAsync: (a: string, b?: any) => mockMakeDirectoryAsync(a, b),
  copyAsync:          (a: any)             => mockCopyAsync(a),
  getInfoAsync:       (a: string)          => mockGetInfoAsync(a),
  deleteAsync:        (a: string, b?: any) => mockDeleteAsync(a, b),
}));

import {
  persistScanFiles,
  appendScanFiles,
  deleteScanFiles,
  verifyScanFiles,
  SCANS_ROOT,
} from '@/modules/scanner/storage/scanFileStorage';

beforeEach(() => {
  mockMakeDirectoryAsync.mockClear();
  mockCopyAsync.mockClear();
  mockGetInfoAsync.mockClear();
  mockDeleteAsync.mockClear();
  mockGetInfoAsync.mockResolvedValue({ exists: false });
});

describe('SCANS_ROOT', () => {
  it('builds documentDirectory/scans/ root path', () => {
    expect(SCANS_ROOT).toBe('file:///doc/scans/');
  });
});

describe('persistScanFiles', () => {
  it('throws when dokId is empty', async () => {
    await expect(persistScanFiles('', ['file://a.jpg'])).rejects.toThrow();
  });

  it('returns empty array when sources empty', async () => {
    const result = await persistScanFiles('dok1', []);
    expect(result).toEqual([]);
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('creates target directory and copies each file with 1-based order', async () => {
    const sources = [
      'file:///cache/optimized/img-a.jpg',
      'file:///cache/optimized/img-b.jpg',
      'file:///cache/optimized/img-c.png',
    ];
    const pages = await persistScanFiles('dok-42', sources);

    // Klasor olusturuldu
    expect(mockMakeDirectoryAsync).toHaveBeenCalledTimes(1);
    expect(mockMakeDirectoryAsync).toHaveBeenCalledWith(
      'file:///doc/scans/dok-42/',
      expect.objectContaining({ intermediates: true }),
    );

    // 3 sayfa kopyalandi
    expect(mockCopyAsync).toHaveBeenCalledTimes(3);
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: sources[0],
      to:   'file:///doc/scans/dok-42/page-1.jpg',
    });
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: sources[2],
      to:   'file:///doc/scans/dok-42/page-3.png',
    });

    // Donen sayfa listesi sirali ve uri'leri hedef yola isaret ediyor
    expect(pages).toHaveLength(3);
    expect(pages[0].order).toBe(1);
    expect(pages[1].order).toBe(2);
    expect(pages[2].order).toBe(3);
    expect(pages[0].uri).toBe('file:///doc/scans/dok-42/page-1.jpg');
    expect(pages[2].uri).toBe('file:///doc/scans/dok-42/page-3.png');

    // Her sayfanin id ve createdAt'i var
    pages.forEach(p => {
      expect(p.id).toBeTruthy();
      expect(p.createdAt).toBeTruthy();
      expect(p.rotation).toBe(0);
    });
  });

  it('throws when a source URI is missing/empty', async () => {
    await expect(
      persistScanFiles('dok-x', ['file://a.jpg', '', 'file://c.jpg'])
    ).rejects.toThrow(/sayfa 2/);
  });

  it('skips copy when source already equals target (idempotent)', async () => {
    // Hedef path zaten dosya sisteminde varmis gibi davran
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    const target = 'file:///doc/scans/dok-7/page-1.jpg';
    const pages = await persistScanFiles('dok-7', [target]);
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(pages[0].uri).toBe(target);
  });
});

describe('appendScanFiles', () => {
  it('appends new pages with continued order from existing', async () => {
    const existing = [
      { id: 'a', uri: 'file:///doc/scans/dok-1/page-1.jpg', order: 1, rotation: 0 as const },
      { id: 'b', uri: 'file:///doc/scans/dok-1/page-2.jpg', order: 2, rotation: 0 as const },
    ];
    const next = await appendScanFiles('dok-1', existing, [
      'file:///cache/new1.jpg',
      'file:///cache/new2.jpg',
    ]);
    expect(next).toHaveLength(4);
    expect(next[2].order).toBe(3);
    expect(next[3].order).toBe(4);
    expect(next[2].uri).toBe('file:///doc/scans/dok-1/page-3.jpg');
    expect(next[3].uri).toBe('file:///doc/scans/dok-1/page-4.jpg');
  });

  it('returns existing untouched when no new sources', async () => {
    const existing = [
      { id: 'a', uri: 'file:///doc/scans/dok-1/page-1.jpg', order: 1, rotation: 0 as const },
    ];
    const next = await appendScanFiles('dok-1', existing, []);
    expect(next).toBe(existing);
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });
});

describe('deleteScanFiles', () => {
  it('deletes the target directory if it exists', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    await deleteScanFiles('dok-9');
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      'file:///doc/scans/dok-9/',
      expect.objectContaining({ idempotent: true }),
    );
  });

  it('no-ops when directory does not exist', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false });
    await deleteScanFiles('dok-x');
    expect(mockDeleteAsync).not.toHaveBeenCalled();
  });

  it('swallows errors silently', async () => {
    mockGetInfoAsync.mockRejectedValueOnce(new Error('boom'));
    await expect(deleteScanFiles('dok-y')).resolves.toBeUndefined();
  });
});

describe('verifyScanFiles', () => {
  it('reports ok=true when all pages exist', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true });
    const r = await verifyScanFiles([
      { id: 'a', uri: 'file://x.jpg', order: 1, rotation: 0 },
    ]);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('reports missing pages', async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({ exists: false });
    const r = await verifyScanFiles([
      { id: 'a', uri: 'file://x.jpg', order: 1, rotation: 0 },
      { id: 'b', uri: 'file://y.jpg', order: 2, rotation: 0 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(['file://y.jpg']);
  });
});
