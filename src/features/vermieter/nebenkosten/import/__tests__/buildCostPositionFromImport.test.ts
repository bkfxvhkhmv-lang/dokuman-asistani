/**
 * D-3.5c-b — buildCostPositionFromImport tests
 */

import {
  buildCostPositionFromImport,
  needsHeatingConsumptionInputs,
  parseConsumptionInput,
  parseEuroInputToCents,
} from '@/features/vermieter/nebenkosten/import/buildCostPositionFromImport';
import type { NkCostPositionImportCandidate } from '@/features/vermieter/nebenkosten/import/types';

function makeCandidate(
  overrides?: Partial<NkCostPositionImportCandidate>,
): NkCostPositionImportCandidate {
  return {
    sourceDokId: 'dok-1',
    descriptionDe: 'Stadtwerke — Rechnung',
    totalCents: 12050,
    currency: 'EUR',
    suggestedCategoryKey: 'heizung',
    suggestedCategoryReasonDe: null,
    suggestedIncludeInCalculation: true,
    needsUserInput: {
      categoryKey: true,
      scope: true,
      unitId: true,
      allocationKey: true,
      amount: false,
    },
    sourceMeta: {},
    ...overrides,
  };
}

describe('buildCostPositionFromImport', () => {
  it('returns CostPosition for property scope happy path', () => {
    const result = buildCostPositionFromImport({
      candidate: makeCandidate(),
      categoryKey: 'heizung',
      scope: 'property',
      allocationKey: { type: 'verbrauch' },
      totalCents: 12050,
      includeInCalculation: true,
      id: 'cp-test-1',
    });

    expect(result).toEqual({
      id: 'cp-test-1',
      categoryKey: 'heizung',
      descriptionDe: 'Stadtwerke — Rechnung',
      totalCents: 12050,
      scope: 'property',
      allocationKey: { type: 'verbrauch' },
      includeInCalculation: true,
    });
    expect(result.unitId).toBeUndefined();
  });

  it('requires unitId when scope is unit', () => {
    expect(() =>
      buildCostPositionFromImport({
        candidate: makeCandidate(),
        categoryKey: 'heizung',
        scope: 'unit',
        allocationKey: { type: 'wohnflaeche' },
        totalCents: 1000,
        includeInCalculation: true,
        id: 'cp-test-2',
      }),
    ).toThrow('BRIEFPILOT_NK_MISSING_UNIT');
  });

  it('includes unitId for unit scope', () => {
    const result = buildCostPositionFromImport({
      candidate: makeCandidate(),
      categoryKey: 'heizung',
      scope: 'unit',
      unitId: 'unit-1',
      allocationKey: { type: 'wohnflaeche' },
      totalCents: 1000,
      includeInCalculation: true,
      id: 'cp-test-3',
    });
    expect(result.unitId).toBe('unit-1');
  });

  it('rejects unitId for property scope', () => {
    expect(() =>
      buildCostPositionFromImport({
        candidate: makeCandidate(),
        categoryKey: 'heizung',
        scope: 'property',
        unitId: 'unit-1',
        allocationKey: { type: 'wohnflaeche' },
        totalCents: 1000,
        includeInCalculation: true,
        id: 'cp-test-4',
      }),
    ).toThrow('BRIEFPILOT_NK_UNEXPECTED_UNIT');
  });

  it('throws for invalid category', () => {
    expect(() =>
      buildCostPositionFromImport({
        candidate: makeCandidate(),
        categoryKey: 'unknown-category',
        scope: 'property',
        allocationKey: { type: 'wohnflaeche' },
        totalCents: 1000,
        includeInCalculation: true,
        id: 'cp-test-5',
      }),
    ).toThrow('BRIEFPILOT_NK_INVALID_CATEGORY');
  });

  it('throws for invalid amount', () => {
    expect(() =>
      buildCostPositionFromImport({
        candidate: makeCandidate(),
        categoryKey: 'heizung',
        scope: 'property',
        allocationKey: { type: 'wohnflaeche' },
        totalCents: -1,
        includeInCalculation: true,
        id: 'cp-test-6',
      }),
    ).toThrow('BRIEFPILOT_NK_INVALID_AMOUNT');
  });

  it('preserves includeInCalculation and allocationKey', () => {
    const result = buildCostPositionFromImport({
      candidate: makeCandidate(),
      categoryKey: 'reparaturen',
      scope: 'property',
      allocationKey: { type: 'manuell', manualPercent: 25 },
      totalCents: 500,
      includeInCalculation: false,
      id: 'cp-test-7',
    });
    expect(result.includeInCalculation).toBe(false);
    expect(result.allocationKey).toEqual({ type: 'manuell', manualPercent: 25 });
  });

  it('uses descriptionDe from candidate', () => {
    const result = buildCostPositionFromImport({
      candidate: makeCandidate({ descriptionDe: 'Custom Beschreibung' }),
      categoryKey: 'heizung',
      scope: 'property',
      allocationKey: { type: 'wohnflaeche' },
      totalCents: 100,
      includeInCalculation: true,
      id: 'cp-test-8',
    });
    expect(result.descriptionDe).toBe('Custom Beschreibung');
  });

  it('does not mutate input', () => {
    const input = {
      candidate: makeCandidate(),
      categoryKey: 'heizung',
      scope: 'property' as const,
      allocationKey: { type: 'wohnflaeche' as const },
      totalCents: 1000,
      includeInCalculation: true,
      id: 'cp-test-9',
    };
    const snapshot = JSON.stringify(input);
    buildCostPositionFromImport(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('includes consumption values when provided', () => {
    const result = buildCostPositionFromImport({
      candidate: makeCandidate(),
      categoryKey: 'heizung',
      scope: 'property',
      allocationKey: { type: 'verbrauch' },
      totalCents: 12050,
      includeInCalculation: true,
      consumptionTenantValue: 30,
      consumptionTotalValue: 100,
      id: 'cp-test-10',
    });

    expect(result.consumptionTenantValue).toBe(30);
    expect(result.consumptionTotalValue).toBe(100);
  });

  it('omits consumption fields when not provided', () => {
    const result = buildCostPositionFromImport({
      candidate: makeCandidate(),
      categoryKey: 'schornstein',
      scope: 'property',
      allocationKey: { type: 'wohneinheit' },
      totalCents: 3000,
      includeInCalculation: true,
      id: 'cp-test-11',
    });

    expect(result.consumptionTenantValue).toBeUndefined();
    expect(result.consumptionTotalValue).toBeUndefined();
  });
});

describe('needsHeatingConsumptionInputs', () => {
  it('is true for heizung/warmwasser with verbrauch', () => {
    expect(needsHeatingConsumptionInputs('heizung', 'verbrauch')).toBe(true);
    expect(needsHeatingConsumptionInputs('warmwasser', 'verbrauch')).toBe(true);
  });

  it('is false for other category or allocation combinations', () => {
    expect(needsHeatingConsumptionInputs('heizung', 'wohnflaeche')).toBe(false);
    expect(needsHeatingConsumptionInputs('schornstein', 'verbrauch')).toBe(false);
  });
});

describe('parseEuroInputToCents', () => {
  it('parses German decimal format', () => {
    expect(parseEuroInputToCents('123,45')).toBe(12345);
    expect(parseEuroInputToCents('1.234,56')).toBe(123456);
  });

  it('returns null for invalid input', () => {
    expect(parseEuroInputToCents('')).toBeNull();
    expect(parseEuroInputToCents('abc')).toBeNull();
  });
});

describe('parseConsumptionInput', () => {
  it('parses non-negative decimal values', () => {
    expect(parseConsumptionInput('30')).toBe(30);
    expect(parseConsumptionInput('1.234,5')).toBe(1234.5);
    expect(parseConsumptionInput('0')).toBe(0);
  });

  it('returns null for invalid or negative input', () => {
    expect(parseConsumptionInput('')).toBeNull();
    expect(parseConsumptionInput('-1')).toBeNull();
    expect(parseConsumptionInput('abc')).toBeNull();
  });
});
