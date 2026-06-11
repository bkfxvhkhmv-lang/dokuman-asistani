/**
 * D-3.5c-b — Build full CostPosition from import candidate + explicit user choices
 */

import type { AllocationKey, AllocationKeyType, CostPosition } from '@/features/vermieter/nebenkosten/domain';
import { COST_CATEGORIES } from '@/features/vermieter/nebenkosten/domain/costCategories';
import { generateId } from '@/utils/formatters';
import type { NkCostPositionImportCandidate } from './types';

export function needsHeatingConsumptionInputs(
  categoryKey: string,
  allocationKeyType: AllocationKeyType,
): boolean {
  return (
    (categoryKey === 'heizung' || categoryKey === 'warmwasser') &&
    allocationKeyType === 'verbrauch'
  );
}

export interface BuildCostPositionFromImportInput {
  candidate: NkCostPositionImportCandidate;
  categoryKey: string;
  scope: 'property' | 'unit';
  unitId?: string;
  allocationKey: AllocationKey;
  totalCents: number;
  includeInCalculation: boolean;
  consumptionTenantValue?: number;
  consumptionTotalValue?: number;
  id?: string;
}

export function buildCostPositionFromImport(
  input: BuildCostPositionFromImportInput,
): CostPosition {
  const {
    candidate,
    categoryKey,
    scope,
    unitId,
    allocationKey,
    totalCents,
    includeInCalculation,
  } = input;

  if (!COST_CATEGORIES[categoryKey]) {
    throw new Error('BRIEFPILOT_NK_INVALID_CATEGORY');
  }

  if (!Number.isFinite(totalCents) || totalCents < 0 || !Number.isInteger(totalCents)) {
    throw new Error('BRIEFPILOT_NK_INVALID_AMOUNT');
  }

  if (scope === 'unit' && !unitId) {
    throw new Error('BRIEFPILOT_NK_MISSING_UNIT');
  }

  if (scope === 'property' && unitId) {
    throw new Error('BRIEFPILOT_NK_UNEXPECTED_UNIT');
  }

  const position: CostPosition = {
    id: input.id ?? generateId(),
    categoryKey,
    descriptionDe: candidate.descriptionDe,
    totalCents,
    scope,
    unitId: scope === 'unit' ? unitId : undefined,
    allocationKey,
    includeInCalculation,
  };

  if (input.consumptionTenantValue !== undefined) {
    position.consumptionTenantValue = input.consumptionTenantValue;
  }
  if (input.consumptionTotalValue !== undefined) {
    position.consumptionTotalValue = input.consumptionTotalValue;
  }

  return position;
}

export function parseEuroInputToCents(value: string): number | null {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const euros = Number(normalized);
  if (!Number.isFinite(euros) || euros < 0) return null;
  return Math.round(euros * 100);
}

/** Parses a non-negative decimal input (German format). */
export function parseConsumptionInput(value: string): number | null {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
