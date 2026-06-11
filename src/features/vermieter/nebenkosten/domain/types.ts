/**
 * D-3.0 — Nebenkostenabrechnung Domain Types
 *
 * Core type definitions for the German Nebenkostenabrechnung calculation engine.
 * No UI, no persistence, no backend calls.
 */

export type UUID = string;
export type ISODate = string; // YYYY-MM-DD
export type EuroCents = number; // always integer, never float

export interface Address {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
}

export interface Landlord {
  id: UUID;
  name: string;
  address: Address;
  iban?: string;
}

export interface Tenant {
  id: UUID;
  name: string;
  address?: Address;
}

export interface Property {
  id: UUID;
  address: Address;
  totalAreaSqm: number;
  numberOfUnits: number;
}

export interface Unit {
  id: UUID;
  propertyId: UUID;
  label: string;
  areaSqm: number;
}

export interface Tenancy {
  id: UUID;
  unitId: UUID;
  tenant: Tenant;
  startDate: ISODate;
  endDate?: ISODate;
  numberOfPersons: number;
  monthlyPrepaymentCents: EuroCents;
}

export interface BillingPeriod {
  startDate: ISODate;
  endDate: ISODate;
}

export type AllocationKeyType =
  | 'wohnflaeche'
  | 'personen'
  | 'wohneinheit'
  | 'verbrauch'
  | 'direkt'
  | 'manuell';

export interface AllocationKey {
  type: AllocationKeyType;
  manualPercent?: number; // only for 'manuell', 0–100
}

export type CostCategoryStatus = 'allocable' | 'warn' | 'blocked';

export interface CostCategory {
  key: string;
  labelDe: string;
  status: CostCategoryStatus;
  defaultAllocationKey: AllocationKeyType;
  betrkvRef?: string;
  warningDe?: string;
}

export interface CostPosition {
  id: UUID;
  categoryKey: string;
  descriptionDe: string;
  totalCents: EuroCents;
  scope: 'property' | 'unit';
  unitId?: UUID;
  allocationKey: AllocationKey;
  consumptionTenantValue?: number;
  consumptionTotalValue?: number;
}

export interface CalculationLineItem {
  costPosition: CostPosition;
  sharePercent: number;
  tenantShareCents: EuroCents;
  categoryStatus: CostCategoryStatus;
}

export interface UnitCalculationResult {
  unit: Unit;
  tenancy: Tenancy;
  billingPeriod: BillingPeriod;
  lineItems: CalculationLineItem[];
  sumTenantCostsCents: EuroCents;
  prepaymentTotalCents: EuroCents;
  differenceCents: EuroCents;
  resultType: 'nachzahlung' | 'guthaben' | 'ausgeglichen';
}

export interface NebenkostenAbrechnung {
  id: UUID;
  property: Property;
  landlord: Landlord;
  billingPeriod: BillingPeriod;
  units: Unit[];
  tenancies: Tenancy[];
  costPositions: CostPosition[];
  results?: UnitCalculationResult[];
  createdAt: ISODate;
}

export interface ValidationIssue {
  code: string;
  messageDe: string;
  severity: 'error' | 'warning' | 'info';
  scope: 'abrechnung' | 'unit' | 'costPosition' | 'tenancy';
  refId?: string;
}

export class AllocationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AllocationError';
    this.code = code;
  }
}
