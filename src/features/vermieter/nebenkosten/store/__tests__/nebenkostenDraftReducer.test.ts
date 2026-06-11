/**
 * D-3.1 — Nebenkosten Draft Store Tests
 */

import type {
  Address,
  BillingPeriod,
  CostPosition,
  Landlord,
  Property,
  Tenancy,
  Unit,
  UnitCalculationResult,
  ValidationIssue,
} from '@/features/vermieter/nebenkosten/domain';
import { nebenkostenDraftReducer } from '@/features/vermieter/nebenkosten/store/nebenkostenDraftReducer';
import { createInitialNebenkostenDraftState } from '@/features/vermieter/nebenkosten/store/initialState';
import type { NebenkostenDraftState } from '@/features/vermieter/nebenkosten/store/types';
import {
  selectCanCalculate,
  selectCostPositionsForUnit,
  selectHasMinimumDraftData,
  selectPropertyCostPositions,
  selectTenanciesForUnit,
} from '@/features/vermieter/nebenkosten/store/selectors';

const address: Address = {
  street: 'Zerrstr.',
  houseNumber: '13',
  postalCode: '66839',
  city: 'Schmelz',
};

function makeLandlord(overrides?: Partial<Landlord>): Landlord {
  return {
    id: 'landlord-1',
    name: 'Asef Karatas',
    address,
    iban: 'DE1234567890',
    ...overrides,
  };
}

function makeProperty(overrides?: Partial<Property>): Property {
  return {
    id: 'prop-1',
    address,
    totalAreaSqm: 200,
    numberOfUnits: 4,
    ...overrides,
  };
}

function makeUnit(overrides?: Partial<Unit>): Unit {
  return {
    id: `unit-${overrides?.id ?? '1'}`,
    propertyId: 'prop-1',
    label: 'EG',
    areaSqm: 60,
    ...overrides,
  };
}

function makeTenancy(overrides?: Partial<Tenancy>): Tenancy {
  return {
    unitId: 'unit-1',
    tenant: { id: 'tenant-1', name: 'Müller' },
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    numberOfPersons: 3,
    monthlyPrepaymentCents: 25_000,
    ...overrides,
    id: `tenancy-${overrides?.id ?? '1'}`,
  };
}

function makeCostPosition(overrides?: Partial<CostPosition>): CostPosition {
  return {
    categoryKey: 'heizung',
    descriptionDe: 'Heizkosten',
    totalCents: 120_000,
    scope: 'property',
    allocationKey: { type: 'wohnflaeche' },
    ...overrides,
    id: `cp-${overrides?.id ?? '1'}`,
  };
}

const billingPeriod: BillingPeriod = {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
};

describe('nebenkostenDraftReducer', () => {
  let initialState: NebenkostenDraftState;

  beforeEach(() => {
    initialState = createInitialNebenkostenDraftState();
  });

  it('should return the correct initial state', () => {
    expect(initialState.landlord).toBeNull();
    expect(initialState.property).toBeNull();
    expect(initialState.billingPeriod).toBeNull();
    expect(initialState.units).toEqual([]);
    expect(initialState.tenancies).toEqual([]);
    expect(initialState.costPositions).toEqual([]);
    expect(initialState.results).toEqual([]);
    expect(initialState.validationIssues).toEqual([]);
    expect(initialState.status).toBe('idle');
  });

  it('SET_LANDLORD sets landlord and marks dirty', () => {
    const landlord = makeLandlord();
    const next = nebenkostenDraftReducer(initialState, {
      type: 'SET_LANDLORD',
      payload: landlord,
    });
    expect(next.landlord).toEqual(landlord);
    expect(next.status).toBe('dirty');
  });

  it('SET_PROPERTY sets property and marks dirty', () => {
    const property = makeProperty();
    const next = nebenkostenDraftReducer(initialState, {
      type: 'SET_PROPERTY',
      payload: property,
    });
    expect(next.property).toEqual(property);
    expect(next.status).toBe('dirty');
  });

  it('SET_BILLING_PERIOD sets period and marks dirty', () => {
    const next = nebenkostenDraftReducer(initialState, {
      type: 'SET_BILLING_PERIOD',
      payload: billingPeriod,
    });
    expect(next.billingPeriod).toEqual(billingPeriod);
    expect(next.status).toBe('dirty');
  });

  describe('units', () => {
    it('ADD_UNIT appends a unit and marks dirty', () => {
      const unit = makeUnit();
      const next = nebenkostenDraftReducer(initialState, {
        type: 'ADD_UNIT',
        payload: unit,
      });
      expect(next.units).toHaveLength(1);
      expect(next.units[0]).toEqual(unit);
      expect(next.status).toBe('dirty');
    });

    it('UPDATE_UNIT updates the unit and marks dirty', () => {
      const unit = makeUnit();
      const state = nebenkostenDraftReducer(initialState, {
        type: 'ADD_UNIT',
        payload: unit,
      });
      const next = nebenkostenDraftReducer(state, {
        type: 'UPDATE_UNIT',
        payload: { id: unit.id, changes: { label: '1. OG', areaSqm: 70 } },
      });
      expect(next.units[0].label).toBe('1. OG');
      expect(next.units[0].areaSqm).toBe(70);
      expect(next.status).toBe('dirty');
    });

    it('REMOVE_UNIT removes the unit and marks dirty', () => {
      const unit = makeUnit();
      const state = nebenkostenDraftReducer(initialState, {
        type: 'ADD_UNIT',
        payload: unit,
      });
      const next = nebenkostenDraftReducer(state, {
        type: 'REMOVE_UNIT',
        payload: unit.id,
      });
      expect(next.units).toHaveLength(0);
      expect(next.status).toBe('dirty');
    });

    it('REMOVE_UNIT also removes linked tenancies', () => {
      const unit = makeUnit();
      const tenancy = makeTenancy();
      let state = nebenkostenDraftReducer(initialState, {
        type: 'ADD_UNIT',
        payload: unit,
      });
      state = nebenkostenDraftReducer(state, {
        type: 'ADD_TENANCY',
        payload: tenancy,
      });
      const next = nebenkostenDraftReducer(state, {
        type: 'REMOVE_UNIT',
        payload: unit.id,
      });
      expect(next.tenancies).toHaveLength(0);
    });

    it('REMOVE_UNIT also removes unit-scoped cost positions', () => {
      const unit = makeUnit();
      const unitCostPosition = makeCostPosition({
        id: 'cp-unit-1',
        scope: 'unit',
        unitId: unit.id,
      });
      const propertyCostPosition = makeCostPosition({
        id: 'property-1',
        scope: 'property',
      });
      let state = nebenkostenDraftReducer(initialState, {
        type: 'ADD_UNIT',
        payload: unit,
      });
      state = nebenkostenDraftReducer(state, {
        type: 'ADD_COST_POSITION',
        payload: unitCostPosition,
      });
      state = nebenkostenDraftReducer(state, {
        type: 'ADD_COST_POSITION',
        payload: propertyCostPosition,
      });
      const next = nebenkostenDraftReducer(state, {
        type: 'REMOVE_UNIT',
        payload: unit.id,
      });
      expect(next.costPositions).toHaveLength(1);
      expect(next.costPositions[0].id).toBe('cp-property-1');
    });
  });

  describe('tenancies', () => {
    it('ADD_TENANCY appends a tenancy and marks dirty', () => {
      const tenancy = makeTenancy();
      const next = nebenkostenDraftReducer(initialState, {
        type: 'ADD_TENANCY',
        payload: tenancy,
      });
      expect(next.tenancies).toHaveLength(1);
      expect(next.tenancies[0]).toEqual(tenancy);
      expect(next.status).toBe('dirty');
    });

    it('UPDATE_TENANCY updates the tenancy and marks dirty', () => {
      const tenancy = makeTenancy();
      let state = nebenkostenDraftReducer(initialState, {
        type: 'ADD_TENANCY',
        payload: tenancy,
      });
      const next = nebenkostenDraftReducer(state, {
        type: 'UPDATE_TENANCY',
        payload: { id: tenancy.id, changes: { numberOfPersons: 4 } },
      });
      expect(next.tenancies[0].numberOfPersons).toBe(4);
      expect(next.status).toBe('dirty');
    });

    it('REMOVE_TENANCY removes only that tenancy', () => {
      const t1 = makeTenancy({ id: '1' });
      const t2 = makeTenancy({ id: '2', unitId: 'unit-2' });
      let state = nebenkostenDraftReducer(initialState, {
        type: 'ADD_TENANCY',
        payload: t1,
      });
      state = nebenkostenDraftReducer(state, {
        type: 'ADD_TENANCY',
        payload: t2,
      });
      const next = nebenkostenDraftReducer(state, {
        type: 'REMOVE_TENANCY',
        payload: t1.id,
      });
      expect(next.tenancies).toHaveLength(1);
      expect(next.tenancies[0].id).toBe(t2.id);
    });
  });

  describe('cost positions', () => {
    it('ADD_COST_POSITION appends and marks dirty', () => {
      const cp = makeCostPosition();
      const next = nebenkostenDraftReducer(initialState, {
        type: 'ADD_COST_POSITION',
        payload: cp,
      });
      expect(next.costPositions).toHaveLength(1);
      expect(next.status).toBe('dirty');
    });

    it('UPDATE_COST_POSITION updates and marks dirty', () => {
      const cp = makeCostPosition();
      let state = nebenkostenDraftReducer(initialState, {
        type: 'ADD_COST_POSITION',
        payload: cp,
      });
      const next = nebenkostenDraftReducer(state, {
        type: 'UPDATE_COST_POSITION',
        payload: { id: cp.id, changes: { totalCents: 150_000 } },
      });
      expect(next.costPositions[0].totalCents).toBe(150_000);
      expect(next.status).toBe('dirty');
    });

    it('REMOVE_COST_POSITION removes and marks dirty', () => {
      const cp = makeCostPosition();
      let state = nebenkostenDraftReducer(initialState, {
        type: 'ADD_COST_POSITION',
        payload: cp,
      });
      const next = nebenkostenDraftReducer(state, {
        type: 'REMOVE_COST_POSITION',
        payload: cp.id,
      });
      expect(next.costPositions).toHaveLength(0);
    });
  });

  it('SET_VALIDATION_ISSUES stores issues without changing dirty status', () => {
    const issue: ValidationIssue = {
      code: 'MISSING_LANDLORD',
      messageDe: 'Vermieter fehlt.',
      severity: 'error',
      scope: 'abrechnung',
    };
    const next = nebenkostenDraftReducer(initialState, {
      type: 'SET_VALIDATION_ISSUES',
      payload: [issue],
    });
    expect(next.validationIssues).toHaveLength(1);
    expect(next.status).toBe('idle');
  });

  it('SET_RESULTS stores results and marks calculated', () => {
    const result = {} as UnitCalculationResult;
    const next = nebenkostenDraftReducer(initialState, {
      type: 'SET_RESULTS',
      payload: [result],
    });
    expect(next.results).toHaveLength(1);
    expect(next.status).toBe('calculated');
  });

  it('RESET_DRAFT returns a fresh initial state', () => {
    let state = nebenkostenDraftReducer(initialState, {
      type: 'SET_LANDLORD',
      payload: makeLandlord(),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_UNIT',
      payload: makeUnit(),
    });
    const next = nebenkostenDraftReducer(state, { type: 'RESET_DRAFT' });
    expect(next).toEqual(createInitialNebenkostenDraftState());
  });
});

describe('selectors', () => {
  let state: NebenkostenDraftState;

  beforeEach(() => {
    state = createInitialNebenkostenDraftState();
  });

  it('selectTenanciesForUnit filters by unitId', () => {
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_TENANCY',
      payload: makeTenancy({ id: '1', unitId: 'unit-a' }),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_TENANCY',
      payload: makeTenancy({ id: '2', unitId: 'unit-b' }),
    });
    expect(selectTenanciesForUnit(state, 'unit-a')).toHaveLength(1);
    expect(selectTenanciesForUnit(state, 'unit-a')[0].id).toBe('tenancy-1');
  });

  it('selectPropertyCostPositions filters property scope', () => {
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_COST_POSITION',
      payload: makeCostPosition({ id: '1', scope: 'property' }),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_COST_POSITION',
      payload: makeCostPosition({
        id: '2',
        scope: 'unit',
        unitId: 'unit-1',
      }),
    });
    expect(selectPropertyCostPositions(state)).toHaveLength(1);
    expect(selectPropertyCostPositions(state)[0].id).toBe('cp-1');
  });

  it('selectCostPositionsForUnit filters unit scope', () => {
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_COST_POSITION',
      payload: makeCostPosition({ id: '1', scope: 'property' }),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_COST_POSITION',
      payload: makeCostPosition({
        id: '2',
        scope: 'unit',
        unitId: 'unit-a',
      }),
    });
    expect(selectCostPositionsForUnit(state, 'unit-a')).toHaveLength(1);
    expect(selectCostPositionsForUnit(state, 'unit-a')[0].id).toBe('cp-2');
  });

  it('selectHasMinimumDraftData is false initially', () => {
    expect(selectHasMinimumDraftData(state)).toBe(false);
  });

  it('selectHasMinimumDraftData is true when all required data exists', () => {
    state = nebenkostenDraftReducer(state, {
      type: 'SET_LANDLORD',
      payload: makeLandlord(),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'SET_PROPERTY',
      payload: makeProperty(),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'SET_BILLING_PERIOD',
      payload: billingPeriod,
    });
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_UNIT',
      payload: makeUnit(),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_TENANCY',
      payload: makeTenancy(),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_COST_POSITION',
      payload: makeCostPosition(),
    });
    expect(selectHasMinimumDraftData(state)).toBe(true);
  });

  it('selectCanCalculate matches selectHasMinimumDraftData', () => {
    expect(selectCanCalculate(state)).toBe(false);
    state = nebenkostenDraftReducer(state, {
      type: 'SET_LANDLORD',
      payload: makeLandlord(),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'SET_PROPERTY',
      payload: makeProperty(),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'SET_BILLING_PERIOD',
      payload: billingPeriod,
    });
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_UNIT',
      payload: makeUnit(),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_TENANCY',
      payload: makeTenancy(),
    });
    state = nebenkostenDraftReducer(state, {
      type: 'ADD_COST_POSITION',
      payload: makeCostPosition(),
    });
    expect(selectCanCalculate(state)).toBe(true);
  });
});
