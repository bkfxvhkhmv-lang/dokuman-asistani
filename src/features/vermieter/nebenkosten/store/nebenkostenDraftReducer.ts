/**
 * D-3.1 — Nebenkosten Draft Store Reducer
 *
 * Pure reducer for in-memory draft state.
 * No side effects, no persistence.
 */

import type { NebenkostenDraftState, NebenkostenDraftAction } from './types';
import { createInitialNebenkostenDraftState } from './initialState';

function markDirty(state: NebenkostenDraftState): NebenkostenDraftState {
  return state.status === 'dirty' ? state : { ...state, status: 'dirty' };
}

export function nebenkostenDraftReducer(
  state: NebenkostenDraftState,
  action: NebenkostenDraftAction,
): NebenkostenDraftState {
  switch (action.type) {
    case 'HYDRATE_DRAFT':
      return { ...action.payload, isHydrated: true };

    case 'RESET_DRAFT':
      return { ...createInitialNebenkostenDraftState(), isHydrated: true };

    case 'SET_LANDLORD':
      return markDirty({ ...state, landlord: action.payload });

    case 'SET_PROPERTY':
      return markDirty({ ...state, property: action.payload });

    case 'SET_BILLING_PERIOD':
      return markDirty({ ...state, billingPeriod: action.payload });

    case 'ADD_UNIT':
      return markDirty({ ...state, units: [...state.units, action.payload] });

    case 'UPDATE_UNIT': {
      const { id, changes } = action.payload;
      return markDirty({
        ...state,
        units: state.units.map((unit) =>
          unit.id === id ? { ...unit, ...changes } : unit,
        ),
      });
    }

    case 'REMOVE_UNIT': {
      const unitId = action.payload;
      return markDirty({
        ...state,
        units: state.units.filter((unit) => unit.id !== unitId),
        tenancies: state.tenancies.filter((tenancy) => tenancy.unitId !== unitId),
        costPositions: state.costPositions.filter(
          (cp) => !(cp.scope === 'unit' && cp.unitId === unitId),
        ),
      });
    }

    case 'ADD_TENANCY':
      return markDirty({ ...state, tenancies: [...state.tenancies, action.payload] });

    case 'UPDATE_TENANCY': {
      const { id, changes } = action.payload;
      return markDirty({
        ...state,
        tenancies: state.tenancies.map((tenancy) =>
          tenancy.id === id ? { ...tenancy, ...changes } : tenancy,
        ),
      });
    }

    case 'REMOVE_TENANCY':
      return markDirty({
        ...state,
        tenancies: state.tenancies.filter((tenancy) => tenancy.id !== action.payload),
      });

    case 'ADD_COST_POSITION':
      return markDirty({
        ...state,
        costPositions: [...state.costPositions, action.payload],
      });

    case 'UPDATE_COST_POSITION': {
      const { id, changes } = action.payload;
      return markDirty({
        ...state,
        costPositions: state.costPositions.map((cp) =>
          cp.id === id ? { ...cp, ...changes } : cp,
        ),
      });
    }

    case 'REMOVE_COST_POSITION':
      return markDirty({
        ...state,
        costPositions: state.costPositions.filter((cp) => cp.id !== action.payload),
      });

    case 'SET_VALIDATION_ISSUES':
      return { ...state, validationIssues: action.payload };

    case 'SET_RESULTS':
      return { ...state, results: action.payload, status: 'calculated' };

    case 'MARK_DIRTY':
      return markDirty(state);

    default:
      return state;
  }
}
