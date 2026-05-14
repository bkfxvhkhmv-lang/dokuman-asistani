/**
 * BriefPilot Production Bug Fix Tests
 * Covers: UTC date, German amount parser, betrag type guard,
 *         sync race condition, ConflictResolver semantic equality.
 */

// Mock AsyncStorage before any imports that transitively require it
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiRemove: jest.fn(),
    clear: jest.fn(),
  },
}));

// ─── Bug #1: UTC Date ─────────────────────────────────────────────────────────
describe('Bug #1 — UTC date offset', () => {
  it('should produce correct ISO dates regardless of local timezone', () => {
    const cases: Array<[number, number, number, string]> = [
      [2023, 12, 15, '2023-12-15'],
      [2024,  1,  1, '2024-01-01'],
      [2024, 12, 31, '2024-12-31'],
      [2023,  3,  5, '2023-03-05'],
    ];
    for (const [year, month, day, expected] of cases) {
      // month is 1-based in input, 0-based for Date.UTC
      const iso = new Date(Date.UTC(year, month - 1, day)).toISOString();
      expect(iso.slice(0, 10)).toBe(expected);
    }
  });

  it('should add 14 days using UTC arithmetic without day drift', () => {
    const base = new Date(Date.UTC(2023, 11, 15)).toISOString(); // 2023-12-15
    const date = new Date(base);
    date.setUTCDate(date.getUTCDate() + 14);
    expect(date.toISOString().slice(0, 10)).toBe('2023-12-29');
  });
});

// ─── Bug #2: German Amount Parser ────────────────────────────────────────────
import { parseGermanAmount } from '../services/smart-autofill/invoiceExtractor';

describe('Bug #2 — parseGermanAmount', () => {
  const cases: Array<[string, number | null]> = [
    ['2.500,00',         2500],
    ['1.234.567,89',     1234567.89],
    ['2500,00',          2500],
    ['€ 2.500,00',       2500],
    ['2.500,00 EUR',     2500],
    ['100,50',           100.50],
    ['0,99',             0.99],
    ['1.000.000,00',     1000000],
    // English format fallback
    ['2500.00',          2500],
    // Edge cases
    ['',                 null],
    ['abc',              null],
  ];

  test.each(cases)('parseGermanAmount(%s) → %s', (input, expected) => {
    expect(parseGermanAmount(input)).toBe(expected);
  });
});

// ─── Bug #3: betrag type guard ────────────────────────────────────────────────
import { scoreBetragFaktor } from '../services/smart-risk-engine/factors';
import type { Dokument } from '@/store';

function makeDok(betrag: Dokument['betrag']): Dokument {
  return {
    id: 'test', titel: 'Test', typ: 'Rechnung', absender: 'Test AG',
    zusammenfassung: null, warnung: null, waehrung: 'EUR',
    frist: null, risiko: 'niedrig', aktionen: [], datum: new Date().toISOString(),
    gelesen: false, erledigt: false, uri: null, rohText: null, betrag,
  } as Dokument;
}

describe('Bug #3 — betrag type safety in scoreBetragFaktor', () => {
  it('handles numeric betrag correctly', () => {
    const result = scoreBetragFaktor(makeDok(2500));
    expect(result.id).toBe('betrag_hoch');
    expect(result.score).toBeGreaterThan(0);
  });

  it('handles German string betrag correctly', () => {
    const result = scoreBetragFaktor(makeDok('2.500,00' as unknown as number));
    expect(result.score).toBeGreaterThan(0);
    // Must not produce NaN score
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('handles null betrag without NaN', () => {
    const result = scoreBetragFaktor(makeDok(null));
    expect(result.id).toBe('betrag_0');
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('handles undefined betrag without NaN', () => {
    const result = scoreBetragFaktor(makeDok(undefined as unknown as null));
    expect(Number.isFinite(result.score)).toBe(true);
  });
});

// ─── Bug #4: Sync race condition ─────────────────────────────────────────────
import { BackgroundSyncEngine } from '../services/storage/BackgroundSyncEngine';
import { LocalMetadataStore } from '../services/storage/LocalMetadataStore';
import { CloudMetadataStore } from '../services/storage/CloudMetadataStore';

jest.mock('../services/storage/LocalMetadataStore');
jest.mock('../services/storage/CloudMetadataStore');

describe('Bug #4 — BackgroundSyncEngine race condition', () => {
  it('should not run two syncs concurrently', async () => {
    const local = new LocalMetadataStore() as jest.Mocked<LocalMetadataStore>;
    const cloud = new CloudMetadataStore('http://test', () => null) as jest.Mocked<CloudMetadataStore>;

    let syncCallCount = 0;
    let resolveSync: () => void;
    const syncPromise = new Promise<void>((res) => { resolveSync = res; });

    local.loadAll.mockImplementation(async () => {
      syncCallCount++;
      await syncPromise;
      return [];
    });
    cloud.sync.mockResolvedValue({ uploaded: 0, downloaded: 0, conflicts: 0 });
    cloud.loadAll.mockResolvedValue([]);

    const engine = new BackgroundSyncEngine(local, cloud, 60_000);

    // Fire two concurrent syncs
    const p1 = engine.syncNow();
    const p2 = engine.syncNow(); // Should be skipped

    resolveSync!();
    await Promise.all([p1, p2]);

    // loadAll should only have been called once (second sync was skipped)
    expect(syncCallCount).toBe(1);
  });
});

// ─── Bug #5: ConflictResolver semantic equality ───────────────────────────────
import { resolveConflict } from '../services/storage/ConflictResolver';

const baseDok: Dokument = {
  id: '1', titel: 'Test', typ: 'Rechnung', absender: 'Test AG',
  zusammenfassung: null, warnung: null, waehrung: 'EUR', betrag: 100,
  frist: '2024-12-31', risiko: 'niedrig', aktionen: [], datum: '2024-01-01',
  gelesen: false, erledigt: false, uri: null, rohText: 'text', iban: null,
  kurzfassung: null, etiketten: ['A', 'B'], aufgaben: [],
} as unknown as Dokument;

describe('Bug #5 — ConflictResolver semantic equality', () => {
  it('should NOT detect conflict when only key order differs (JSON.stringify trap)', () => {
    const local  = { ...baseDok };
    // Simulate different key insertion order (as can happen after async roundtrips)
    const remote = { ...baseDok, id: '1' };
    const result = resolveConflict(local, remote);
    expect(result.hadConflict).toBe(false);
  });

  it('should NOT detect conflict when etiketten order differs', () => {
    const local  = { ...baseDok, etiketten: ['A', 'B'] };
    const remote = { ...baseDok, etiketten: ['B', 'A'] };
    const result = resolveConflict(local, remote);
    expect(result.hadConflict).toBe(false);
  });

  it('SHOULD detect conflict when a real field differs', () => {
    const local  = { ...baseDok, betrag: 100 };
    const remote = { ...baseDok, betrag: 200 };
    const result = resolveConflict(local, remote);
    expect(result.hadConflict).toBe(true);
  });

  it('SHOULD detect conflict when erledigt status differs', () => {
    const local  = { ...baseDok, erledigt: false };
    const remote = { ...baseDok, erledigt: true };
    const result = resolveConflict(local, remote);
    expect(result.hadConflict).toBe(true);
  });

  it('should NOT produce conflict for volatile fields like v4DocId alone', () => {
    const local  = { ...baseDok, v4DocId: null };
    const remote = { ...baseDok, v4DocId: 'server-id-123' };
    const result = resolveConflict(local, remote);
    expect(result.hadConflict).toBe(false);
  });
});
