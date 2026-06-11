/**
 * D-3.1 — Nebenkosten Draft Store Types
 *
 * In-memory draft state for building a Nebenkostenabrechnung.
 * No persistence, no UI, no backend calls.
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

export type DraftStatus = 'idle' | 'dirty' | 'calculated';

export interface NebenkostenDraftState {
  landlord: Landlord | null;
  property: Property | null;
  billingPeriod: BillingPeriod | null;
  units: Unit[];
  tenancies: Tenancy[];
  costPositions: CostPosition[];
  results: UnitCalculationResult[];
  validationIssues: ValidationIssue[];
  status: DraftStatus;
}

export interface UnitUpdateInput {
  id: Unit['id'];
  changes: Partial<Omit<Unit, 'id' | 'propertyId'>>;
}

export interface TenancyUpdateInput {
  id: Tenancy['id'];
  changes: Partial<Omit<Tenancy, 'id' | 'unitId'>>;
}

export interface CostPositionUpdateInput {
  id: CostPosition['id'];
  changes: Partial<Omit<CostPosition, 'id'>>;
}

export type NebenkostenDraftAction =
  | { type: 'RESET_DRAFT' }
  | { type: 'SET_LANDLORD'; payload: Landlord | null }
  | { type: 'SET_PROPERTY'; payload: Property | null }
  | { type: 'SET_BILLING_PERIOD'; payload: BillingPeriod | null }
  | { type: 'ADD_UNIT'; payload: Unit }
  | { type: 'UPDATE_UNIT'; payload: UnitUpdateInput }
  | { type: 'REMOVE_UNIT'; payload: Unit['id'] }
  | { type: 'ADD_TENANCY'; payload: Tenancy }
  | { type: 'UPDATE_TENANCY'; payload: TenancyUpdateInput }
  | { type: 'REMOVE_TENANCY'; payload: Tenancy['id'] }
  | { type: 'ADD_COST_POSITION'; payload: CostPosition }
  | { type: 'UPDATE_COST_POSITION'; payload: CostPositionUpdateInput }
  | { type: 'REMOVE_COST_POSITION'; payload: CostPosition['id'] }
  | { type: 'SET_VALIDATION_ISSUES'; payload: ValidationIssue[] }
  | { type: 'SET_RESULTS'; payload: UnitCalculationResult[] }
  | { type: 'MARK_DIRTY' };
