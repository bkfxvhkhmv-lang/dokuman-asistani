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
  computePrepaymentTotalCents,
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
    includeInCalculation: true,
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

  it('contains Belegeinsicht note', () => {
    const abrechnung: NebenkostenAbrechnung = {
      id: 'nk-1',
      property: makeProperty(),
      landlord: makeLandlord(),
      billingPeriod: makeBillingPeriod(),
      units: [makeUnit()],
      tenancies: [makeTenancy()],
      costPositions: [makeCostPosition()],
      createdAt: '2024-01-01',
    };
    const result = calculateUnitResult(abrechnung, makeUnit(), makeTenancy());
    const letter = generateLetterDraft(result, abrechnung, makeLandlord());
    expect(letter).toContain('Belegeinsicht: Die Belege zu dieser Abrechnung stehen Ihnen auf Anfrage zur Einsicht bereit.');
  });

  it('shows excluded blocked position with 0,00 € and note', () => {
    const abrechnung: NebenkostenAbrechnung = {
      id: 'nk-1',
      property: makeProperty(),
      landlord: makeLandlord(),
      billingPeriod: makeBillingPeriod(),
      units: [makeUnit()],
      tenancies: [makeTenancy()],
      costPositions: [
        makeCostPosition({
          categoryKey: 'reparaturen',
          totalCents: 50000,
          includeInCalculation: false,
        }),
      ],
      createdAt: '2024-01-01',
    };
    const result = calculateUnitResult(abrechnung, makeUnit(), makeTenancy());
    const letter = generateLetterDraft(result, abrechnung, makeLandlord());
    expect(letter).toContain(formatEuro(0));
    expect(letter).toContain('(nicht umlagefähig laut BetrKV — nicht einbezogen)');
  });
});

// ------------------------------------------------------------------
// includeInCalculation
// ------------------------------------------------------------------

describe('includeInCalculation', () => {
  const property = makeProperty();
  const unit = makeUnit();
  const tenancy = makeTenancy();
  const billingPeriod = makeBillingPeriod();

  it('blocked with includeInCalculation false → tenantShareCents 0 and excluded from sum', () => {
    const cp = makeCostPosition({
      categoryKey: 'reparaturen',
      totalCents: 100000,
      includeInCalculation: false,
    });
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
    const result = calculateUnitResult(abrechnung, unit, tenancy);
    expect(result.lineItems[0].tenantShareCents).toBe(0);
    expect(result.sumTenantCostsCents).toBe(0);
  });

  it('blocked with includeInCalculation true → counted in sum and emits warning', () => {
    const cp = makeCostPosition({
      categoryKey: 'reparaturen',
      totalCents: 100000,
      includeInCalculation: true,
    });
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
    const result = calculateUnitResult(abrechnung, unit, tenancy);
    expect(result.lineItems[0].tenantShareCents).toBeGreaterThan(0);
    expect(result.sumTenantCostsCents).toBeGreaterThan(0);

    const issues = validateAbrechnung(abrechnung);
    expect(issues.some((i) => i.code === 'BLOCKED_CATEGORY_INCLUDED')).toBe(true);
  });

  it('allocable category unaffected by default include flag', () => {
    const cp = makeCostPosition({ categoryKey: 'grundsteuer', totalCents: 100000 });
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
    const result = calculateUnitResult(abrechnung, unit, tenancy);
    expect(result.lineItems[0].tenantShareCents).toBe(30000);
  });

  it('warn category unaffected', () => {
    const cp = makeCostPosition({ categoryKey: 'hauswart', totalCents: 100000 });
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
    const result = calculateUnitResult(abrechnung, unit, tenancy);
    expect(result.lineItems[0].tenantShareCents).toBe(30000);
  });
});

// ------------------------------------------------------------------
// computePrepaymentTotalCents
// ------------------------------------------------------------------

describe('computePrepaymentTotalCents', () => {
  it('full 12-month period with full tenancy', () => {
    const tenancy = makeTenancy({ startDate: '2024-01-01', endDate: '2024-12-31' });
    const period = makeBillingPeriod({ startDate: '2024-01-01', endDate: '2024-12-31' });
    expect(computePrepaymentTotalCents(tenancy, period)).toBe(12 * 15000);
  });

  it('move-in on 15th of first month', () => {
    const tenancy = makeTenancy({ startDate: '2024-01-15', endDate: '2024-12-31' });
    const period = makeBillingPeriod({ startDate: '2024-01-01', endDate: '2024-12-31' });
    // January: 31 - 15 + 1 = 17 days → 17/31
    const january = Math.round(15000 * (17 / 31));
    const rest = 11 * 15000;
    expect(computePrepaymentTotalCents(tenancy, period)).toBe(january + rest);
  });

  it('move-out on 15th of last month', () => {
    const tenancy = makeTenancy({ startDate: '2024-01-01', endDate: '2024-12-15' });
    const period = makeBillingPeriod({ startDate: '2024-01-01', endDate: '2024-12-31' });
    // December: 15 days → 15/31
    const december = Math.round(15000 * (15 / 31));
    const rest = 11 * 15000;
    expect(computePrepaymentTotalCents(tenancy, period)).toBe(rest + december);
  });

  it('start and end inside same month', () => {
    const tenancy = makeTenancy({ startDate: '2024-03-10', endDate: '2024-03-20' });
    const period = makeBillingPeriod({ startDate: '2024-01-01', endDate: '2024-12-31' });
    // March: 20 - 10 + 1 = 11 days → 11/31
    expect(computePrepaymentTotalCents(tenancy, period)).toBe(Math.round(15000 * (11 / 31)));
  });

  it('tenancy entirely outside billing period returns 0', () => {
    const tenancy = makeTenancy({ startDate: '2025-01-01', endDate: '2025-12-31' });
    const period = makeBillingPeriod({ startDate: '2024-01-01', endDate: '2024-12-31' });
    expect(computePrepaymentTotalCents(tenancy, period)).toBe(0);
  });

  it('February in 28-day year', () => {
    const tenancy = makeTenancy({ startDate: '2023-02-01', endDate: '2023-02-28' });
    const period = makeBillingPeriod({ startDate: '2023-01-01', endDate: '2023-12-31' });
    expect(computePrepaymentTotalCents(tenancy, period)).toBe(15000);
  });

  it('February in 29-day leap year', () => {
    const tenancy = makeTenancy({ startDate: '2024-02-01', endDate: '2024-02-29' });
    const period = makeBillingPeriod({ startDate: '2024-01-01', endDate: '2024-12-31' });
    expect(computePrepaymentTotalCents(tenancy, period)).toBe(15000);
  });

  it('open-ended tenancy bills through billingPeriod.endDate', () => {
    const tenancy = makeTenancy({ startDate: '2024-01-01' }); // no endDate
    const period = makeBillingPeriod({ startDate: '2024-01-01', endDate: '2024-06-30' });
    expect(computePrepaymentTotalCents(tenancy, period)).toBe(6 * 15000);
  });
});

// ------------------------------------------------------------------
// personen allocation
// ------------------------------------------------------------------

describe('personen allocation', () => {
  const property = makeProperty();
  const unit = makeUnit();

  it('personen with 2 persons out of 6 total → ~0.333', () => {
    const tenancy = makeTenancy({ numberOfPersons: 2 });
    const t2 = makeTenancy({ id: 't2', unitId: 'unit-2', numberOfPersons: 4 });
    const input: import('../allocationEngine').AllocationInput = {
      key: { type: 'personen' },
      unit,
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy, t2],
    };
    expect(computeSharePercent(input)).toBeCloseTo(0.3333, 3);
  });

  it('personen with all tenancies having 0 persons → ZERO_DENOMINATOR', () => {
    const tenancy = makeTenancy({ numberOfPersons: 0 });
    const t2 = makeTenancy({ id: 't2', unitId: 'unit-2', numberOfPersons: 0 });
    const input: import('../allocationEngine').AllocationInput = {
      key: { type: 'personen' },
      unit,
      property,
      tenancy,
      activeTenanciesInPeriod: [tenancy, t2],
    };
    try {
      computeSharePercent(input);
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe('ZERO_DENOMINATOR');
    }
  });

  it('emits PERSONEN_STATIC_ASSUMPTION info when personen key used', () => {
    const tenancy = makeTenancy({ numberOfPersons: 2 });
    const t2 = makeTenancy({ id: 't2', unitId: 'unit-2', numberOfPersons: 4 });
    const abrechnung: NebenkostenAbrechnung = {
      id: 'nk-1',
      property,
      landlord: makeLandlord(),
      billingPeriod: makeBillingPeriod(),
      units: [unit, makeUnit({ id: 'unit-2', areaSqm: 80 })],
      tenancies: [tenancy, t2],
      costPositions: [
        makeCostPosition({ allocationKey: { type: 'personen' }, totalCents: 60000 }),
      ],
      createdAt: '2024-01-01',
    };
    const issues = validateAbrechnung(abrechnung);
    expect(issues.some((i) => i.code === 'PERSONEN_STATIC_ASSUMPTION' && i.severity === 'info')).toBe(true);
  });
});

// ------------------------------------------------------------------
// HeizkVO validation
// ------------------------------------------------------------------

describe('HeizkVO validation', () => {
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

  it('heizung with wohnflaeche key → HEIZKOSTEN_NOT_VERBRAUCH', () => {
    const a = makeBaseAbrechnung();
    a.costPositions = [makeCostPosition({ categoryKey: 'heizung', allocationKey: { type: 'wohnflaeche' } })];
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'HEIZKOSTEN_NOT_VERBRAUCH' && i.severity === 'warning')).toBe(true);
  });

  it('heizung with verbrauch key + values → no HEIZKOSTEN_NOT_VERBRAUCH', () => {
    const a = makeBaseAbrechnung();
    a.costPositions = [
      makeCostPosition({
        categoryKey: 'heizung',
        allocationKey: { type: 'verbrauch' },
        consumptionTenantValue: 30,
        consumptionTotalValue: 100,
      }),
    ];
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'HEIZKOSTEN_NOT_VERBRAUCH')).toBe(false);
  });

  it('heizung with verbrauch key + missing consumptionTotalValue → HEIZKOSTEN_VERBRAUCH_MISSING error', () => {
    const a = makeBaseAbrechnung();
    a.costPositions = [
      makeCostPosition({
        categoryKey: 'heizung',
        allocationKey: { type: 'verbrauch' },
      }),
    ];
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'HEIZKOSTEN_VERBRAUCH_MISSING' && i.severity === 'error')).toBe(true);
  });

  it('warmwasser with verbrauch key + zero consumptionTotalValue → HEIZKOSTEN_VERBRAUCH_MISSING error', () => {
    const a = makeBaseAbrechnung();
    a.costPositions = [
      makeCostPosition({
        categoryKey: 'warmwasser',
        allocationKey: { type: 'verbrauch' },
        consumptionTotalValue: 0,
      }),
    ];
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'HEIZKOSTEN_VERBRAUCH_MISSING' && i.severity === 'error')).toBe(true);
  });
});

// ------------------------------------------------------------------
// Fristen validation
// ------------------------------------------------------------------

describe('Fristen validation', () => {
  it('valid abrechnung includes ABRECHNUNGSFRIST_HINWEIS info', () => {
    const a: NebenkostenAbrechnung = {
      id: 'nk-1',
      property: makeProperty(),
      landlord: makeLandlord(),
      billingPeriod: makeBillingPeriod(),
      units: [makeUnit()],
      tenancies: [makeTenancy()],
      costPositions: [makeCostPosition()],
      createdAt: '2024-01-01',
    };
    const issues = validateAbrechnung(a);
    expect(issues.some((i) => i.code === 'ABRECHNUNGSFRIST_HINWEIS' && i.severity === 'info')).toBe(true);
  });
});
