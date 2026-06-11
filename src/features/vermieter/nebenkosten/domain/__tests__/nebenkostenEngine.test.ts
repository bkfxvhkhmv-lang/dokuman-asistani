/**
 * D-3.0 — Nebenkostenabrechnung Domain Engine Tests
 */

import {
  formatEuro,
  formatPercent,
  centsFromEuro,
  euroFromCents,
} from '../currencyUtils';

import { computeSharePercent } from '../allocationEngine';
import type { AllocationInput } from '../allocationEngine';

import {
  calculateLineItem,
  calculateUnitResult,
  calculateAbrechnung,
} from '../calculationEngine';

import { validateAbrechnung } from '../validation';

import { generateLetterDraft } from '../letterGenerator';

import type {
  Property,
  Unit,
  Tenancy,
  BillingPeriod,
  CostPosition,
  NebenkostenAbrechnung,
  Landlord,
} from '../types';

// ------------------------------------------------------------------
// Factories
// ------------------------------------------------------------------

function makeProperty(overrides?: Partial<Property>): Property {
  return {
    id: 'prop-1',
    address: { street: 'Musterstr.', houseNumber: '1', postalCode: '12345', city: 'Berlin' },
    totalAreaSqm: 200,
    numberOfUnits: 4,
    ...overrides,
  };
}

function makeUnit(overrides?: Partial<Unit>): Unit {
  return {
    id: 'unit-1',
    propertyId: 'prop-1',
    label: 'Wohnung 1',
    areaSqm: 60,
    ...overrides,
  };
}

function makeTenancy(overrides?: Partial<Tenancy>): Tenancy {
  return {
    id: 'tenancy-1',
    unitId: 'unit-1',
    tenant: { id: 'tenant-1', name: 'Max Mustermann' },
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    numberOfPersons: 2,
    monthlyPrepaymentCents: 15000,
    ...overrides,
  };
}

function makeBillingPeriod(overrides?: Partial<BillingPeriod>): BillingPeriod {
  return {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    ...overrides,
  };
}

function makeCostPosition(overrides?: Partial<CostPosition>): CostPosition {
  return {
    id: 'cp-1',
    categoryKey: 'grundsteuer',
    descriptionDe: 'Grundsteuer 2024',
    totalCents: 120000,
    scope: 'property',
    allocationKey: { type: 'wohnflaeche' },
    ...overrides,
  };
}

function makeLandlord(overrides?: Partial<Landlord>): Landlord {
  return {
    id: 'landlord-1',
    name: 'Erika Musterland',
    address: { street: 'Musterstr.', houseNumber: '1', postalCode: '12345', city: 'Berlin' },
    ...overrides,
  };
}

// ------------------------------------------------------------------
// currencyUtils
// ------------------------------------------------------------------

describe('currencyUtils', () => {
  it('formatEuro(123456) → "1.234,56 €"', () => {
    expect(formatEuro(123456)).toMatch(/1\.234,56\s€/);
  });

  it('formatEuro(0) → "0,00 €"', () => {
    expect(formatEuro(0)).toMatch(/0,00\s€/);
  });

  it('formatPercent(0.3333) → "33,33 %"', () => {
    expect(formatPercent(0.3333)).toBe('33,33 %');
  });

  it('centsFromEuro(12.5) → 1250', () => {
    expect(centsFromEuro(12.5)).toBe(1250);
  });

  it('euroFromCents(1250) → 12.5', () => {
    expect(euroFromCents(1250)).toBe(12.5);
  });
});

// ------------------------------------------------------------------
// allocationEngine
// ------------------------------------------------------------------

describe('allocationEngine', () => {
  const property = makeProperty();
  const unit = makeUnit();
  const tenancy = makeTenancy();

  it('wohnflaeche: 60sqm / 200sqm → 0.3', () => {
    const input: AllocationInput = {
      key: { type: 'wohnflaeche' },
      unit,
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy],
    };
    expect(computeSharePercent(input)).toBe(0.3);
  });

  it('wohneinheit: 1 / 4 units → 0.25', () => {
    const input: AllocationInput = {
      key: { type: 'wohneinheit' },
      unit,
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy],
    };
    expect(computeSharePercent(input)).toBe(0.25);
  });

  it('verbrauch: 30 / 100 → 0.3', () => {
    const input: AllocationInput = {
      key: { type: 'verbrauch' },
      unit,
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy],
      consumptionTenantValue: 30,
      consumptionTotalValue: 100,
    };
    expect(computeSharePercent(input)).toBe(0.3);
  });

  it('direkt → 1', () => {
    const input: AllocationInput = {
      key: { type: 'direkt' },
      unit,
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy],
    };
    expect(computeSharePercent(input)).toBe(1);
  });

  it('manuell: manualPercent=25 → 0.25', () => {
    const input: AllocationInput = {
      key: { type: 'manuell', manualPercent: 25 },
      unit,
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy],
    };
    expect(computeSharePercent(input)).toBe(0.25);
  });

  it('personen: 2 persons / 6 total → ~0.333', () => {
    // NOTE: personen deeper edge cases deferred to D-3.1
    const t2 = makeTenancy({ id: 't2', unitId: 'unit-2', numberOfPersons: 4 });
    const input: AllocationInput = {
      key: { type: 'personen' },
      unit,
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy, t2],
    };
    expect(computeSharePercent(input)).toBeCloseTo(0.3333, 3);
  });

  it('throws ZERO_DENOMINATOR when totalAreaSqm = 0', () => {
    const input: AllocationInput = {
      key: { type: 'wohnflaeche' },
      unit,
      property: makeProperty({ totalAreaSqm: 0 }),
      tenancy,
      activeTenanciesInPeriod: [tenancy],
    };
    try {
      computeSharePercent(input);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe('ZERO_DENOMINATOR');
    }
  });

  it('throws CONSUMPTION_EXCEEDS_TOTAL when tenantValue > totalValue', () => {
    const input: AllocationInput = {
      key: { type: 'verbrauch' },
      unit,
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy],
      consumptionTenantValue: 150,
      consumptionTotalValue: 100,
    };
    try {
      computeSharePercent(input);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe('CONSUMPTION_EXCEEDS_TOTAL');
    }
  });

  it('throws NEGATIVE_VALUE for negative inputs', () => {
    const input: AllocationInput = {
      key: { type: 'wohnflaeche' },
      unit: makeUnit({ areaSqm: -10 }),
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy],
    };
    try {
      computeSharePercent(input);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe('NEGATIVE_VALUE');
    }
  });

  it('throws MISSING_MANUAL_PERCENT for manuell without percent', () => {
    const input: AllocationInput = {
      key: { type: 'manuell' },
      unit,
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy],
    };
    try {
      computeSharePercent(input);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe('MISSING_MANUAL_PERCENT');
    }
  });
});

// ------------------------------------------------------------------
// calculationEngine
// ------------------------------------------------------------------

describe('calculationEngine', () => {
  const property = makeProperty();
  const unit = makeUnit();
  const tenancy = makeTenancy();
  const billingPeriod = makeBillingPeriod();

  it('Nachzahlung: costs > prepayment', () => {
    // prepayment for 12 months = 12 * 15000 = 180000
    // sharePercent = 60/200 = 0.3
    // need totalCents > 180000 / 0.3 = 600000
    const cp = makeCostPosition({ totalCents: 700000 });
    const abrechnung: NebenkostenAbrechnung = {
      id: 'nk-1',
      property,
      landlord: makeLandlord(),
      billingPeriod,
      units: [unit],
      tenancies: [tenancy],
      costPositions: [cp],
      createdAt: '2024-01-01',
    };
    const results = calculateAbrechnung(abrechnung);
    expect(results[0].resultType).toBe('nachzahlung');
    expect(results[0].differenceCents).toBeGreaterThan(0);
  });

  it('Guthaben: prepayment > costs', () => {
    const cp = makeCostPosition({ totalCents: 100 }); // way below prepayment
    const abrechnung: NebenkostenAbrechnung = {
      id: 'nk-1',
      property,
      landlord: makeLandlord(),
      billingPeriod,
      units: [unit],
      tenancies: [tenancy],
      costPositions: [cp],
      createdAt: '2024-01-01',
    };
    const results = calculateAbrechnung(abrechnung);
    expect(results[0].resultType).toBe('guthaben');
    expect(results[0].differenceCents).toBeLessThan(0);
  });

  it('Ausgeglichen: costs === prepayment', () => {
    // 60/200 * total = prepayment → total = prepayment / 0.3
    // prepayment for 12 months = 12 * 15000 = 180000
    // total needs to be 180000 / 0.3 = 600000
    const cp = makeCostPosition({ totalCents: 600000 });
    const abrechnung: NebenkostenAbrechnung = {
      id: 'nk-1',
      property,
      landlord: makeLandlord(),
      billingPeriod,
      units: [unit],
      tenancies: [tenancy],
      costPositions: [cp],
      createdAt: '2024-01-01',
    };
    const results = calculateAbrechnung(abrechnung);
    expect(results[0].resultType).toBe('ausgeglichen');
    expect(results[0].differenceCents).toBe(0);
  });

  it('property-scope cost applies to ALL units', () => {
    const unit2 = makeUnit({ id: 'unit-2', label: 'Wohnung 2', areaSqm: 80 });
    const tenancy2 = makeTenancy({ id: 'tenancy-2', unitId: 'unit-2', monthlyPrepaymentCents: 20000 });
    const cp = makeCostPosition({ scope: 'property', totalCents: 120000 });
    const abrechnung: NebenkostenAbrechnung = {
      id: 'nk-1',
      property,
      landlord: makeLandlord(),
      billingPeriod,
      units: [unit, unit2],
      tenancies: [tenancy, tenancy2],
      costPositions: [cp],
      createdAt: '2024-01-01',
    };
    const results = calculateAbrechnung(abrechnung);
    expect(results).toHaveLength(2);
    expect(results[0].lineItems).toHaveLength(1);
    expect(results[1].lineItems).toHaveLength(1);
  });

  it('unit-scope cost applies ONLY to matching unit', () => {
    const unit2 = makeUnit({ id: 'unit-2', label: 'Wohnung 2', areaSqm: 80 });
    const tenancy2 = makeTenancy({ id: 'tenancy-2', unitId: 'unit-2' });
    const cp = makeCostPosition({ scope: 'unit', unitId: 'unit-1', totalCents: 50000 });
    const abrechnung: NebenkostenAbrechnung = {
      id: 'nk-1',
      property,
      landlord: makeLandlord(),
      billingPeriod,
      units: [unit, unit2],
      tenancies: [tenancy, tenancy2],
      costPositions: [cp],
      createdAt: '2024-01-01',
    };
    const results = calculateAbrechnung(abrechnung);
    expect(results[0].lineItems).toHaveLength(1);
    expect(results[1].lineItems).toHaveLength(0);
  });

  it('unit-scope cost does NOT appear in other unit result', () => {
    const unit2 = makeUnit({ id: 'unit-2', label: 'Wohnung 2', areaSqm: 80 });
    const tenancy2 = makeTenancy({ id: 'tenancy-2', unitId: 'unit-2' });
    const cp = makeCostPosition({ scope: 'unit', unitId: 'unit-2', totalCents: 50000 });
    const abrechnung: NebenkostenAbrechnung = {
      id: 'nk-1',
      property,
      landlord: makeLandlord(),
      billingPeriod,
      units: [unit, unit2],
      tenancies: [tenancy, tenancy2],
      costPositions: [cp],
      createdAt: '2024-01-01',
    };
    const results = calculateAbrechnung(abrechnung);
    expect(results[0].lineItems).toHaveLength(0);
    expect(results[1].lineItems).toHaveLength(1);
  });
});

// ------------------------------------------------------------------
// validation
// ------------------------------------------------------------------

describe('validation', () => {
  function makeBaseAbrechnung(): NebenkostenAbrechnung {
    return {
      id: 'nk-1',
      property: makeProperty(),
      landlord: makeLandlord(),
      billingPeriod: makeBillingPeriod(),
      units: [makeUnit()],
      tenancies: [makeTenancy()],
      costPositions: [makeCostPosition()],
      createdAt: '2024-01-01',
    };
  }

  it('PERIOD_END_BEFORE_START error', () => {
    const a = makeBaseAbrechnung();
    a.billingPeriod = { startDate: '2024-12-01', endDate: '2024-01-01' };
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'PERIOD_END_BEFORE_START')).toBe(true);
    expect(issues.find((i) => i.code === 'PERIOD_END_BEFORE_START')!.severity).toBe('error');
  });

  it('TOTAL_AREA_ZERO error', () => {
    const a = makeBaseAbrechnung();
    a.property.totalAreaSqm = 0;
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'TOTAL_AREA_ZERO')).toBe(true);
    expect(issues.find((i) => i.code === 'TOTAL_AREA_ZERO')!.severity).toBe('error');
  });

  it('NO_UNITS error', () => {
    const a = makeBaseAbrechnung();
    a.units = [];
    a.property.numberOfUnits = 0;
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'NO_UNITS')).toBe(true);
    expect(issues.find((i) => i.code === 'NO_UNITS')!.severity).toBe('error');
  });

  it('NEGATIVE_COST error', () => {
    const a = makeBaseAbrechnung();
    a.costPositions = [makeCostPosition({ totalCents: -100 })];
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'NEGATIVE_COST')).toBe(true);
    expect(issues.find((i) => i.code === 'NEGATIVE_COST')!.severity).toBe('error');
  });

  it('CONSUMPTION_EXCEEDS_TOTAL error', () => {
    const a = makeBaseAbrechnung();
    a.costPositions = [
      makeCostPosition({
        allocationKey: { type: 'verbrauch' },
        consumptionTenantValue: 150,
        consumptionTotalValue: 100,
      }),
    ];
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'CONSUMPTION_EXCEEDS_TOTAL')).toBe(true);
    expect(issues.find((i) => i.code === 'CONSUMPTION_EXCEEDS_TOTAL')!.severity).toBe('error');
  });

  it('PERIOD_OVER_12_MONTHS warning', () => {
    const a = makeBaseAbrechnung();
    a.billingPeriod = { startDate: '2024-01-01', endDate: '2025-06-01' };
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'PERIOD_OVER_12_MONTHS')).toBe(true);
    expect(issues.find((i) => i.code === 'PERIOD_OVER_12_MONTHS')!.severity).toBe('warning');
  });

  it('BLOCKED_CATEGORY_PRESENT warning for reparaturen', () => {
    const a = makeBaseAbrechnung();
    a.costPositions = [makeCostPosition({ categoryKey: 'reparaturen' })];
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'BLOCKED_CATEGORY_PRESENT')).toBe(true);
    expect(issues.find((i) => i.code === 'BLOCKED_CATEGORY_PRESENT')!.severity).toBe('warning');
  });

  it('WARN_CATEGORY_PRESENT warning for heizung', () => {
    const a = makeBaseAbrechnung();
    a.costPositions = [makeCostPosition({ categoryKey: 'heizung' })];
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'WARN_CATEGORY_PRESENT')).toBe(true);
    expect(issues.find((i) => i.code === 'WARN_CATEGORY_PRESENT')!.severity).toBe('warning');
  });

  it('HEIZKOSTEN_HKVO warning for warmwasser', () => {
    const a = makeBaseAbrechnung();
    a.costPositions = [makeCostPosition({ categoryKey: 'warmwasser' })];
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'HEIZKOSTEN_HKVO')).toBe(true);
    expect(issues.find((i) => i.code === 'HEIZKOSTEN_HKVO')!.severity).toBe('warning');
  });

  it('MANUAL_ALLOCATION_KEY warning', () => {
    const a = makeBaseAbrechnung();
    a.costPositions = [makeCostPosition({ allocationKey: { type: 'manuell', manualPercent: 25 } })];
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'MANUAL_ALLOCATION_KEY')).toBe(true);
    expect(issues.find((i) => i.code === 'MANUAL_ALLOCATION_KEY')!.severity).toBe('warning');
  });
});

// ------------------------------------------------------------------
// letterGenerator
// ------------------------------------------------------------------

describe('letterGenerator', () => {
  it('contains "Nebenkostenabrechnung"', () => {
    const result = calculateUnitResult(
      {
        id: 'nk-1',
        property: makeProperty(),
        landlord: makeLandlord(),
        billingPeriod: makeBillingPeriod(),
        units: [makeUnit()],
        tenancies: [makeTenancy()],
        costPositions: [makeCostPosition()],
        createdAt: '2024-01-01',
      },
      makeUnit(),
      makeTenancy(),
    );
    const letter = generateLetterDraft(result, {
      id: 'nk-1',
      property: makeProperty(),
      landlord: makeLandlord(),
      billingPeriod: makeBillingPeriod(),
      units: [makeUnit()],
      tenancies: [makeTenancy()],
      costPositions: [makeCostPosition()],
      createdAt: '2024-01-01',
    }, makeLandlord());
    expect(letter).toContain('Nebenkostenabrechnung');
  });

  it('contains "Rechen- und Strukturhilfe"', () => {
    const result = calculateUnitResult(
      {
        id: 'nk-1',
        property: makeProperty(),
        landlord: makeLandlord(),
        billingPeriod: makeBillingPeriod(),
        units: [makeUnit()],
        tenancies: [makeTenancy()],
        costPositions: [makeCostPosition()],
        createdAt: '2024-01-01',
      },
      makeUnit(),
      makeTenancy(),
    );
    const letter = generateLetterDraft(result, {
      id: 'nk-1',
      property: makeProperty(),
      landlord: makeLandlord(),
      billingPeriod: makeBillingPeriod(),
      units: [makeUnit()],
      tenancies: [makeTenancy()],
      costPositions: [makeCostPosition()],
      createdAt: '2024-01-01',
    }, makeLandlord());
    expect(letter).toContain('Rechen- und Strukturhilfe');
  });

  it('contains result type label (Nachzahlung / Guthaben / Ausgeglichen)', () => {
    const result = calculateUnitResult(
      {
        id: 'nk-1',
        property: makeProperty(),
        landlord: makeLandlord(),
        billingPeriod: makeBillingPeriod(),
        units: [makeUnit()],
        tenancies: [makeTenancy()],
        costPositions: [makeCostPosition({ totalCents: 500000 })],
        createdAt: '2024-01-01',
      },
      makeUnit(),
      makeTenancy(),
    );
    const abrechnung: NebenkostenAbrechnung = {
      id: 'nk-1',
      property: makeProperty(),
      landlord: makeLandlord(),
      billingPeriod: makeBillingPeriod(),
      units: [makeUnit()],
      tenancies: [makeTenancy()],
      costPositions: [makeCostPosition({ totalCents: 500000 })],
      createdAt: '2024-01-01',
    };
    const letter = generateLetterDraft(result, abrechnung, makeLandlord());
    const hasResultLabel =
      letter.includes('Nachzahlung') ||
      letter.includes('Guthaben') ||
      letter.includes('Ausgeglichen');
    expect(hasResultLabel).toBe(true);
  });

  it('contains disclaimer', () => {
    const result = calculateUnitResult(
      {
        id: 'nk-1',
        property: makeProperty(),
        landlord: makeLandlord(),
        billingPeriod: makeBillingPeriod(),
        units: [makeUnit()],
        tenancies: [makeTenancy()],
        costPositions: [makeCostPosition()],
        createdAt: '2024-01-01',
      },
      makeUnit(),
      makeTenancy(),
    );
    const letter = generateLetterDraft(result, {
      id: 'nk-1',
      property: makeProperty(),
      landlord: makeLandlord(),
      billingPeriod: makeBillingPeriod(),
      units: [makeUnit()],
      tenancies: [makeTenancy()],
      costPositions: [makeCostPosition()],
      createdAt: '2024-01-01',
    }, makeLandlord());
    expect(letter).toContain('ersetzt keine rechtliche Beratung');
  });
});
