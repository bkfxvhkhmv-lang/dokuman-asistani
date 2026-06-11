/**
 * D-3.2a — Store-Domain Wiring Tests
 *
 * Tests buildAbrechnungFromDraft, runNebenkostenCalculation,
 * and the validation severity selectors.
 */

import type {
  Address,
  BillingPeriod,
  CostPosition,
  Landlord,
  Property,
  Tenancy,
  Unit,
} from '@/features/vermieter/nebenkosten/domain';
import { nebenkostenDraftReducer } from '@/features/vermieter/nebenkosten/store/nebenkostenDraftReducer';
import { createInitialNebenkostenDraftState } from '@/features/vermieter/nebenkosten/store/initialState';
import type { NebenkostenDraftState } from '@/features/vermieter/nebenkosten/store/types';
import {
  buildAbrechnungFromDraft,
  DraftBuildError,
} from '@/features/vermieter/nebenkosten/store/buildAbrechnungFromDraft';
import { runNebenkostenCalculation } from '@/features/vermieter/nebenkosten/store/runNebenkostenCalculation';
import {
  selectHasBlockingErrors,
  selectValidationErrors,
  selectValidationWarnings,
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
    includeInCalculation: true,
    ...overrides,
    id: `cp-${overrides?.id ?? '1'}`,
  };
}

const billingPeriod: BillingPeriod = {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
};

function makeCompleteDraft(): NebenkostenDraftState {
  let state = createInitialNebenkostenDraftState();
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
  return state;
}

describe('buildAbrechnungFromDraft', () => {
  it('builds a NebenkostenAbrechnung from a complete draft', () => {
    const state = makeCompleteDraft();
    const abrechnung = buildAbrechnungFromDraft(state);

    expect(abrechnung.id).toBe('draft');
    expect(abrechnung.landlord).toEqual(state.landlord);
    expect(abrechnung.property).toEqual(state.property);
    expect(abrechnung.billingPeriod).toEqual(state.billingPeriod);
    expect(abrechnung.units).toEqual(state.units);
    expect(abrechnung.tenancies).toEqual(state.tenancies);
    expect(abrechnung.costPositions).toEqual(state.costPositions);
    expect(abrechnung.createdAt).toBe('1970-01-01');
  });

  it('throws DraftBuildError MISSING_LANDLORD when landlord is null', () => {
    const state = makeCompleteDraft();
    const stateWithoutLandlord = nebenkostenDraftReducer(state, {
      type: 'SET_LANDLORD',
      payload: null,
    });

    expect(() => buildAbrechnungFromDraft(stateWithoutLandlord)).toThrow(
      DraftBuildError,
    );
    expect(() => buildAbrechnungFromDraft(stateWithoutLandlord)).toThrow(
      'Vermieter fehlt.',
    );

    try {
      buildAbrechnungFromDraft(stateWithoutLandlord);
    } catch (err) {
      expect(err).toBeInstanceOf(DraftBuildError);
      expect((err as DraftBuildError).code).toBe('MISSING_LANDLORD');
    }
  });

  it('throws DraftBuildError MISSING_PROPERTY when property is null', () => {
    const state = makeCompleteDraft();
    const stateWithoutProperty = nebenkostenDraftReducer(state, {
      type: 'SET_PROPERTY',
      payload: null,
    });

    expect(() => buildAbrechnungFromDraft(stateWithoutProperty)).toThrow(
      DraftBuildError,
    );

    try {
      buildAbrechnungFromDraft(stateWithoutProperty);
    } catch (err) {
      expect((err as DraftBuildError).code).toBe('MISSING_PROPERTY');
    }
  });

  it('throws DraftBuildError MISSING_BILLING_PERIOD when billingPeriod is null', () => {
    const state = makeCompleteDraft();
    const stateWithoutPeriod = nebenkostenDraftReducer(state, {
      type: 'SET_BILLING_PERIOD',
      payload: null,
    });

    expect(() => buildAbrechnungFromDraft(stateWithoutPeriod)).toThrow(
      DraftBuildError,
    );

    try {
      buildAbrechnungFromDraft(stateWithoutPeriod);
    } catch (err) {
      expect((err as DraftBuildError).code).toBe('MISSING_BILLING_PERIOD');
    }
  });

  it('does not mutate the input state', () => {
    const state = makeCompleteDraft();
    const snapshot = JSON.stringify(state);
    buildAbrechnungFromDraft(state);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('runNebenkostenCalculation', () => {
  it('returns ok true and results for a complete valid draft', () => {
    const state = makeCompleteDraft();
    const result = runNebenkostenCalculation(state);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].unit.id).toBe('unit-1');
    expect(result.validationIssues.length).toBeGreaterThanOrEqual(0);
  });

  it('returns ok false with MISSING_LANDLORD when landlord is missing', () => {
    let state = makeCompleteDraft();
    state = nebenkostenDraftReducer(state, {
      type: 'SET_LANDLORD',
      payload: null,
    });

    const result = runNebenkostenCalculation(state);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error).toBeInstanceOf(DraftBuildError);
    expect((result.error as DraftBuildError).code).toBe('MISSING_LANDLORD');
    expect(result.validationIssues).toEqual([]);
  });

  it('returns ok false with validation issue when domain validation fails', () => {
    let state = makeCompleteDraft();
    state = nebenkostenDraftReducer(state, {
      type: 'SET_PROPERTY',
      payload: makeProperty({ totalAreaSqm: 0 }),
    });

    const result = runNebenkostenCalculation(state);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.validationIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TOTAL_AREA_ZERO', severity: 'error' }),
      ]),
    );
    expect(result.error).toBeInstanceOf(Error);
  });

  it('returns ok true and preserves warnings for warning-only draft', () => {
    let state = makeCompleteDraft();
    // Remove cost positions so domain emits NO_COST_POSITIONS warning.
    state = nebenkostenDraftReducer(state, {
      type: 'REMOVE_COST_POSITION',
      payload: state.costPositions[0].id,
    });

    const result = runNebenkostenCalculation(state);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.validationIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'NO_COST_POSITIONS',
          severity: 'warning',
        }),
      ]),
    );
  });

  it('can apply output to reducer via SET_VALIDATION_ISSUES and SET_RESULTS', () => {
    const state = makeCompleteDraft();
    const calcResult = runNebenkostenCalculation(state);

    expect(calcResult.ok).toBe(true);
    if (!calcResult.ok) return;

    let next = nebenkostenDraftReducer(state, {
      type: 'SET_VALIDATION_ISSUES',
      payload: calcResult.validationIssues,
    });
    next = nebenkostenDraftReducer(next, {
      type: 'SET_RESULTS',
      payload: calcResult.results,
    });

    expect(next.validationIssues).toEqual(calcResult.validationIssues);
    expect(next.results).toEqual(calcResult.results);
    expect(next.status).toBe('calculated');
  });
});

describe('validation severity selectors', () => {
  let state: NebenkostenDraftState;

  beforeEach(() => {
    state = createInitialNebenkostenDraftState();
  });

  it('selectValidationErrors returns only error issues', () => {
    state = nebenkostenDraftReducer(state, {
      type: 'SET_VALIDATION_ISSUES',
      payload: [
        {
          code: 'TOTAL_AREA_ZERO',
          messageDe: 'Gesamtfläche muss größer als 0 sein.',
          severity: 'error',
          scope: 'abrechnung',
        },
        {
          code: 'NO_COST_POSITIONS',
          messageDe: 'Keine Kostenpositionen vorhanden.',
          severity: 'warning',
          scope: 'abrechnung',
        },
      ],
    });

    expect(selectValidationErrors(state)).toHaveLength(1);
    expect(selectValidationErrors(state)[0].code).toBe('TOTAL_AREA_ZERO');
  });

  it('selectValidationWarnings returns only warning issues', () => {
    state = nebenkostenDraftReducer(state, {
      type: 'SET_VALIDATION_ISSUES',
      payload: [
        {
          code: 'TOTAL_AREA_ZERO',
          messageDe: 'Gesamtfläche muss größer als 0 sein.',
          severity: 'error',
          scope: 'abrechnung',
        },
        {
          code: 'NO_COST_POSITIONS',
          messageDe: 'Keine Kostenpositionen vorhanden.',
          severity: 'warning',
          scope: 'abrechnung',
        },
      ],
    });

    expect(selectValidationWarnings(state)).toHaveLength(1);
    expect(selectValidationWarnings(state)[0].code).toBe('NO_COST_POSITIONS');
  });

  it('selectHasBlockingErrors is true when an error issue exists', () => {
    state = nebenkostenDraftReducer(state, {
      type: 'SET_VALIDATION_ISSUES',
      payload: [
        {
          code: 'TOTAL_AREA_ZERO',
          messageDe: 'Gesamtfläche muss größer als 0 sein.',
          severity: 'error',
          scope: 'abrechnung',
        },
      ],
    });

    expect(selectHasBlockingErrors(state)).toBe(true);
  });

  it('selectHasBlockingErrors is false when only warnings exist', () => {
    state = nebenkostenDraftReducer(state, {
      type: 'SET_VALIDATION_ISSUES',
      payload: [
        {
          code: 'NO_COST_POSITIONS',
          messageDe: 'Keine Kostenpositionen vorhanden.',
          severity: 'warning',
          scope: 'abrechnung',
        },
      ],
    });

    expect(selectHasBlockingErrors(state)).toBe(false);
  });
});
