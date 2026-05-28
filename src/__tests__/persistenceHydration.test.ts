/**
 * Persistence hydration + migration tests.
 * Verifies that relative paths survive container UUID changes.
 */

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///new-uuid/Documents/',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@/store/initialState', () => ({ STORE_KEY: 'bp_store' }));

// Import after mocks
import { loadPersistedState } from '@/store/persistence';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGetItem = AsyncStorage.getItem as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('rehydrateDocumentFiles — relativePath', () => {
  it('rehydrates page uri from relativePath using current documentDirectory', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify({
      dokumente: [{
        id: 'doc1', titel: 'Test', typ: 'Sonstiges', absender: 'X',
        zusammenfassung: null, warnung: null, betrag: null, waehrung: '€',
        frist: null, risiko: 'niedrig', aktionen: [], datum: '', gelesen: false, erledigt: false,
        uri: 'file:///old-uuid/Documents/scans/doc1/page-1.jpg',
        fileRelativePath: 'scans/doc1/page-1.jpg',
        pages: [{
          id: 'p1', uri: 'file:///old-uuid/Documents/scans/doc1/page-1.jpg',
          relativePath: 'scans/doc1/page-1.jpg', order: 1, rotation: 0,
        }],
      }],
    }));

    const state = await loadPersistedState();
    const dok = state!.dokumente![0];

    expect(dok.uri).toBe('file:///new-uuid/Documents/scans/doc1/page-1.jpg');
    expect(dok.pages![0].uri).toBe('file:///new-uuid/Documents/scans/doc1/page-1.jpg');
    expect(dok.pages![0].relativePath).toBe('scans/doc1/page-1.jpg');
  });
});

describe('rehydrateDocumentFiles — migration from old absolute URI', () => {
  it('migrates old absolute URI to relativePath and rehydrates with new documentDirectory', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify({
      dokumente: [{
        id: 'doc2', titel: 'Old', typ: 'Sonstiges', absender: 'Y',
        zusammenfassung: null, warnung: null, betrag: null, waehrung: '€',
        frist: null, risiko: 'niedrig', aktionen: [], datum: '', gelesen: false, erledigt: false,
        uri: 'file:///old-uuid/Documents/scans/doc2/page-1.pdf',
        pages: [{
          id: 'p2', uri: 'file:///old-uuid/Documents/scans/doc2/page-1.pdf',
          order: 1, rotation: 0,
          // no relativePath — old format
        }],
      }],
    }));

    const state = await loadPersistedState();
    const dok = state!.dokumente![0];

    expect(dok.uri).toBe('file:///new-uuid/Documents/scans/doc2/page-1.pdf');
    expect(dok.fileRelativePath).toBe('scans/doc2/page-1.pdf');
    expect(dok.pages![0].uri).toBe('file:///new-uuid/Documents/scans/doc2/page-1.pdf');
    expect(dok.pages![0].relativePath).toBe('scans/doc2/page-1.pdf');
  });

  it('leaves non-scans uris unchanged', async () => {
    mockGetItem.mockResolvedValueOnce(JSON.stringify({
      dokumente: [{
        id: 'doc3', titel: 'No file', typ: 'Sonstiges', absender: 'Z',
        zusammenfassung: null, warnung: null, betrag: null, waehrung: '€',
        frist: null, risiko: 'niedrig', aktionen: [], datum: '', gelesen: false, erledigt: false,
        uri: null, pages: [],
      }],
    }));

    const state = await loadPersistedState();
    expect(state!.dokumente![0].uri).toBeNull();
  });
});
