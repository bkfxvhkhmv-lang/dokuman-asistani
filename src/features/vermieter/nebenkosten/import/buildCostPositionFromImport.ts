/**
 * D-3.5c-b — Build full CostPosition from import candidate + explicit user choices
 */

import type { AllocationKey, CostPosition } from '@/features/vermieter/nebenkosten/domain';
import { COST_CATEGORIES } from '@/features/vermieter/nebenkosten/domain/costCategories';
import { generateId } from '@/utils/formatters';
import type { NkCostPositionImportCandidate } from './types';

export interface BuildCostPositionFromImportInput {
  candidate: NkCostPositionImportCandidate;
  categoryKey: string;
  scope: 'property' | 'unit';
  unitId?: string;
  allocationKey: AllocationKey;
  totalCents: number;
  includeInCalculation: boolean;
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

  return {
    id: input.id ?? generateId(),
    categoryKey,
    descriptionDe: candidate.descriptionDe,
    totalCents,
    scope,
    unitId: scope === 'unit' ? unitId : undefined,
    allocationKey,
    includeInCalculation,
  };
}

export function parseEuroInputToCents(value: string): number | null {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const euros = Number(normalized);
  if (!Number.isFinite(euros) || euros < 0) return null;
  return Math.round(euros * 100);
}
