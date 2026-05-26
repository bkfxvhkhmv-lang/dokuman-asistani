/**
 * Golden regression tests for document identity guard rules.
 *
 * These cases encode the invariants that MUST hold regardless of
 * future OCR or inference changes:
 *   1. Negative Betrag → primary action is gutschrift, never zahlen
 *   2. Positive Betrag + Rechnung → primary action is zahlen
 *   3. "Zimmer" field → never appears in any display group
 *   4. "Bankname" / "Zahlungsempfänger" → zahlung group only, never sender
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaInsetsContext: { Consumer: ({ children }: any) => children({ top: 0, right: 0, bottom: 0, left: 0 }) },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { getDetailActionPlan } from '@/features/detail/components/ActionsPanel';
import { groupDocumentFields } from '@/features/detail/components/details-panel/groupDocumentFields';
import type { Dokument } from '@/store';
import type { ErweiterteFeld } from '@/utils/types';

// ── Fixture factory ───────────────────────────────────────────────────────────

function makeDok(overrides: Partial<Dokument> = {}): Dokument {
  return {
    id: 'test-dok',
    titel: 'Test',
    typ: 'Rechnung',
    absender: 'Test GmbH',
    zusammenfassung: null,
    warnung: null,
    betrag: null,
    waehrung: 'EUR',
    frist: null,
    risiko: 'niedrig',
    aktionen: [],
    datum: '2026-05-26T10:00:00.000Z',
    gelesen: false,
    erledigt: false,
    uri: null,
    rohText: null,
    ...overrides,
  };
}

function makeField(label: string, wert: string): ErweiterteFeld {
  return { key: label.toLowerCase().replace(/\s+/g, '_'), label, wert, icon: '' };
}

// ── Case 1: Vodafone Gutschrift — negative Betrag → gutschrift, never zahlen ──

describe('Case 1 — Vodafone Gutschrift', () => {
  const dok = makeDok({
    betrag: -93.01,
    absender: 'Vodafone Kundenservice',
    typ: 'Rechnung',
    aktionen: ['zahlen'],
  });

  it('primary action is gutschrift', () => {
    const plan = getDetailActionPlan(dok, null, {});
    expect(plan).not.toBeNull();
    expect(plan!.primary.key).toBe('gutschrift');
  });

  it('primary action is never zahlen for negative Betrag', () => {
    const plan = getDetailActionPlan(dok, null, {});
    expect(plan!.primary.key).not.toBe('zahlen');
  });
});

// ── Case 2: Positive Rechnung — positive Betrag + Rechnung → zahlen ───────────

describe('Case 2 — Positive Rechnung', () => {
  const dok = makeDok({
    betrag: 48.50,
    typ: 'Rechnung',
    aktionen: ['zahlen'],
    frist: null,
  });

  it('primary action is zahlen', () => {
    const plan = getDetailActionPlan(dok, null, {});
    expect(plan).not.toBeNull();
    expect(plan!.primary.key).toBe('zahlen');
  });
});

// ── Case 3: Zimmer guard — Zimmer field never appears in any display group ────

describe('Case 3 — Schmelz Zimmer guard', () => {
  const dok = makeDok({
    betrag: 30.00,
    absender: 'Gemeinde Schmelz',
    typ: 'Bußgeldbescheid',
    aktionen: ['zahlen', 'einspruch'],
  });

  const extrahierteFelder: ErweiterteFeld[] = [
    makeField('Zimmer', '1.24'),
    makeField('Betrag', '30,00 €'),
  ];

  it('Zimmer field is absent from zahlung group', () => {
    const groups = groupDocumentFields(dok, extrahierteFelder);
    expect(groups.zahlung.some(f => f.label === 'Zimmer')).toBe(false);
  });

  it('Zimmer field is absent from wichtigste group', () => {
    const groups = groupDocumentFields(dok, extrahierteFelder);
    expect(groups.wichtigste.some(f => f.label === 'Zimmer')).toBe(false);
  });

  it('Zimmer field is absent from all groups', () => {
    const groups = groupDocumentFields(dok, extrahierteFelder);
    const allFields = [...groups.wichtigste, ...groups.zahlung, ...groups.kontakt, ...groups.vertrag, ...groups.weitere];
    expect(allFields.some(f => f.label === 'Zimmer')).toBe(false);
  });
});

// ── Case 4: Bankname sender guard — Bankname/Zahlungsempfänger → zahlung only ─

describe('Case 4 — Bankname / Zahlungsempfänger sender guard', () => {
  const dok = makeDok({
    absender: 'Gemeinde Schmelz',
    betrag: 30.00,
    typ: 'Bußgeldbescheid',
  });

  const extrahierteFelder: ErweiterteFeld[] = [
    makeField('Bankname', 'Kreissparkasse Saarlouis'),
    makeField('Zahlungsempfänger', 'Gemeinde Schmelz'),
  ];

  it('Bankname appears in zahlung group', () => {
    const groups = groupDocumentFields(dok, extrahierteFelder);
    expect(groups.zahlung.some(f => f.label === 'Bankname')).toBe(true);
  });

  it('Bankname does not appear in wichtigste (sender) group', () => {
    const groups = groupDocumentFields(dok, extrahierteFelder);
    expect(groups.wichtigste.some(f => f.label === 'Bankname')).toBe(false);
  });

  it('Zahlungsempfänger appears in zahlung group', () => {
    const groups = groupDocumentFields(dok, extrahierteFelder);
    expect(groups.zahlung.some(f => f.label === 'Zahlungsempfänger')).toBe(true);
  });

  it('Zahlungsempfänger does not appear in wichtigste (sender) group', () => {
    const groups = groupDocumentFields(dok, extrahierteFelder);
    expect(groups.wichtigste.some(f => f.label === 'Zahlungsempfänger')).toBe(false);
  });

  it('dok.absender is unaffected by extrahierteFelder Bankname', () => {
    // groupDocumentFields must never mutate dok
    groupDocumentFields(dok, extrahierteFelder);
    expect(dok.absender).toBe('Gemeinde Schmelz');
  });
});
