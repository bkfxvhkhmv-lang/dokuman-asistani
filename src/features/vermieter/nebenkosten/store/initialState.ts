/**
 * D-3.1 — Nebenkosten Draft Store Initial State
 */

import type { NebenkostenDraftState } from './types';

export function createInitialNebenkostenDraftState(): NebenkostenDraftState {
  return {
    landlord: null,
    property: null,
    billingPeriod: null,
    units: [],
    tenancies: [],
    costPositions: [],
    results: [],
    validationIssues: [],
    status: 'idle',
    isHydrated: false,
  };
}
