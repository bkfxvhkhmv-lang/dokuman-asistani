/**
 * ShareUploadService — #143A gate tests
 *
 * Kontrol edilen davranışlar:
 *  1. Share PDF → enqueueV4Upload çağrılır
 *  2. Share image → enqueueV4Upload çağrılır
 *  3. dispatch yoksa → enqueueV4Upload çağrılmaz
 *  4. enqueueV4Upload throw eder → import rollback olmaz (dokument döner)
 *  5. importSource korunur: pdf|photo
 *  6. customTitle/titel yazılmaz; fallback title zayıf olarak kalır
 */

// ── Mocks — must be hoisted before imports ──────────────────────────────────

const mockEnqueueV4Upload = jest.fn();

jest.mock('@/services/v4EnqueueUpload', () => ({
  enqueueV4Upload: (...args: unknown[]) => mockEnqueueV4Upload(...args),
}));

const mockPersistScanFiles = jest.fn(async (dokId: string, sources: string[]) =>
  sources.map((_, i) => ({
    id:           `p-${i}`,
    uri:          `file:///doc/scans/${dokId}/page-${i + 1}.jpg`,
    relativePath: `scans/${dokId}/page-${i + 1}.jpg`,
    order:        i + 1,
    rotation:     0 as const,
    createdAt:    '2026-06-17T12:00:00.000Z',
  })),
);

jest.mock('@/modules/scanner/storage/scanFileStorage', () => ({
  persistScanFiles: (dokId: string, sources: string[]) => mockPersistScanFiles(dokId, sources),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  cacheDirectory:    'file:///cache/',
  EncodingType:      { Base64: 'base64', UTF8: 'utf8' },
  readAsStringAsync: jest.fn(async () => 'mocked-content'),
  copyAsync:         jest.fn(async () => undefined),
}));

jest.mock('@/services/visionApi', () => ({
  analysiereText:       jest.fn(() => ({
    typ: 'Rechnung', risiko: 'niedrig', betrag: null, frist: null,
    absender: '', aktionen: [], zusammenfassung: 'Zusammenfassung', kurzfassung: '', iban: null,
  })),
  extractTextFromImage: jest.fn(async () => ({ text: 'image ocr text' })),
}));

jest.mock('@/services/SmartAutoFillService', () => ({
  runSmartAutoFill:       jest.fn(() => ({ extracted: { typ: 'Rechnung' }, fields: [] })),
  mergeAutoFillIntoDokument: jest.fn((_r: unknown, _b: unknown) => ({
    typ: 'Rechnung', absender: 'Absender GmbH', betrag: null, frist: null, risiko: 'niedrig', titel: '',
  })),
}));

jest.mock('@/services/SmartCategorizationService', () => ({
  runSmartCategorization:   jest.fn(() => ({ confidence: 0, typ: 'Sonstiges' })),
  applyCategoryToVisionResult: jest.fn(),
}));

jest.mock('@/utils', () => ({
  generateId: jest.fn(() => 'test-doc-id-001'),
}));

jest.mock('@/i18n/langStore', () => ({
  getLangSync: () => 'de',
}));

jest.mock('@/i18n/translations', () => ({
  t: (_lang: string, key: string) => key,
}));

jest.mock('@/utils/displaySanitizer', () => ({
  isStrongTitle: jest.fn((s: string) => s.length > 10),
}));

jest.mock('@/utils/offlineFallbackTitle', () => ({
  buildOfflineFallbackTitle: jest.fn(() => '2026-06-17 · PDF 01'),
  shareFileTypeToImportSource: jest.fn((type: string) => {
    if (type === 'pdf')   return 'pdf';
    if (type === 'image') return 'photo';
    return 'unknown';
  }),
}));

jest.mock('@/services/SmartNotificationsService', () => ({
  buildUploadNotificationContent:       jest.fn(() => ({ title: 'Dokument', body: 'Fertig' })),
  ensureAndroidDefaultNotificationChannel: jest.fn(async () => undefined),
  withAndroidNotificationChannel:       jest.fn((c: unknown) => c),
}));

jest.mock('@/services/vision-api/summarizeText', () => ({
  erstelleKurzfassung: jest.fn(() => 'Kurzfassung'),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => undefined),
}), { virtual: true });

// ── Subject under test ───────────────────────────────────────────────────────

import { processSharedFile } from '@/services/ShareUploadService';

// ── Helpers ──────────────────────────────────────────────────────────────────

const PDF_URI   = 'file:///cache/briefpilot_share_1234.pdf';
const IMAGE_URI = 'file:///cache/briefpilot_share_5678.jpg';
const ALL_DOCS  = [] as any[];

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('processSharedFile — #143A: enqueueV4Upload integration', () => {
  it('PDF import: enqueueV4Upload is called with correct docId and uri', async () => {
    const dispatch = jest.fn();
    const result = await processSharedFile(PDF_URI, ALL_DOCS, dispatch);

    expect(result).not.toBeNull();
    expect(mockEnqueueV4Upload).toHaveBeenCalledTimes(1);
    const [passedDispatch, passedDocId, passedUri, passedFilename] = mockEnqueueV4Upload.mock.calls[0];
    expect(passedDispatch).toBe(dispatch);
    expect(passedDocId).toBe('test-doc-id-001');
    expect(passedUri).toMatch(/^file:\/\/\/doc\/scans\/test-doc-id-001\//);
    expect(passedFilename).toBe('briefpilot_share_1234.pdf');
  });

  it('image import: enqueueV4Upload is called', async () => {
    const dispatch = jest.fn();
    const result = await processSharedFile(IMAGE_URI, ALL_DOCS, dispatch);

    expect(result).not.toBeNull();
    expect(mockEnqueueV4Upload).toHaveBeenCalledTimes(1);
    const [, , passedUri] = mockEnqueueV4Upload.mock.calls[0];
    expect(passedUri).toMatch(/^file:\/\/\/doc\/scans\/test-doc-id-001\//);
  });

  it('no dispatch → enqueueV4Upload not called', async () => {
    const result = await processSharedFile(PDF_URI, ALL_DOCS);

    expect(result).not.toBeNull();
    expect(mockEnqueueV4Upload).not.toHaveBeenCalled();
  });

  it('enqueueV4Upload throw → import not rolled back (dokument returned)', async () => {
    mockEnqueueV4Upload.mockImplementationOnce(() => { throw new Error('upload network fail'); });
    const dispatch = jest.fn();
    // Should not throw; local document still returned
    const result = await processSharedFile(PDF_URI, ALL_DOCS, dispatch);
    expect(result).not.toBeNull();
    expect(result?.dokument.id).toBe('test-doc-id-001');
  });

  it('enqueueV4Upload has suppressAlert: true (local save is complete)', async () => {
    const dispatch = jest.fn();
    await processSharedFile(PDF_URI, ALL_DOCS, dispatch);

    const options = mockEnqueueV4Upload.mock.calls[0][4];
    expect(options?.suppressAlert).toBe(true);
  });
});

describe('processSharedFile — importSource preserved', () => {
  it('pdf URI → importSource pdf', async () => {
    const dispatch = jest.fn();
    const result = await processSharedFile(PDF_URI, ALL_DOCS, dispatch);
    expect(result?.dokument.importSource).toBe('pdf');
  });

  it('image URI → importSource photo', async () => {
    const dispatch = jest.fn();
    const result = await processSharedFile(IMAGE_URI, ALL_DOCS, dispatch);
    expect(result?.dokument.importSource).toBe('photo');
  });
});

describe('processSharedFile — title/customTitle invariants', () => {
  it('returned dokument has no customTitle set (offline fallback is weak)', async () => {
    const dispatch = jest.fn();
    const result = await processSharedFile(PDF_URI, ALL_DOCS, dispatch);
    expect((result?.dokument as any).customTitle).toBeUndefined();
  });

  it('returned dokument has no aiDisplayTitle set by service', async () => {
    const dispatch = jest.fn();
    const result = await processSharedFile(PDF_URI, ALL_DOCS, dispatch);
    expect((result?.dokument as any).aiDisplayTitle).toBeUndefined();
  });
});
