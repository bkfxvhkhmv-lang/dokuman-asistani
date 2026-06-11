/**
 * D-3.1 — Nebenkosten Draft Store Selectors
 *
 * Pure selector helpers. No side effects, no calculation.
 */

import type { NebenkostenDraftState } from './types';

export function selectUnitsForProperty(state: NebenkostenDraftState) {
  return state.units;
}

export function selectTenanciesForUnit(
  state: NebenkostenDraftState,
  unitId: string,
) {
  return state.tenancies.filter((tenancy) => tenancy.unitId === unitId);
}

export function selectCostPositionsForUnit(
  state: NebenkostenDraftState,
  unitId: string,
) {
  return state.costPositions.filter(
    (cp) => cp.scope === 'unit' && cp.unitId === unitId,
  );
}

export function selectPropertyCostPositions(state: NebenkostenDraftState) {
  return state.costPositions.filter((cp) => cp.scope === 'property');
}

export function selectHasMinimumDraftData(state: NebenkostenDraftState) {
  return (
    state.landlord !== null &&
    state.property !== null &&
    state.billingPeriod !== null &&
    state.units.length > 0 &&
    state.tenancies.length > 0 &&
    state.costPositions.length > 0
  );
}

export function selectCanCalculate(state: NebenkostenDraftState) {
  return selectHasMinimumDraftData(state);
}
