/**
 * D-3.2a — Store-Domain Calculation Orchestrator
 *
 * Wires the draft store to the domain engine:
 * DraftState -> build -> validate -> calculate.
 * No UI, no persistence.
 */

import {
  calculateAbrechnung,
  validateAbrechnung,
} from '@/features/vermieter/nebenkosten/domain';
import type { CalculationResult } from './types';
import { buildAbrechnungFromDraft, DraftBuildError } from './buildAbrechnungFromDraft';

export function runNebenkostenCalculation(
  state: Parameters<typeof buildAbrechnungFromDraft>[0],
): CalculationResult {
  let abrechnung;

  try {
    abrechnung = buildAbrechnungFromDraft(state);
  } catch (err) {
    if (err instanceof DraftBuildError) {
      return {
        ok: false,
        validationIssues: [],
        error: err,
      };
    }
    throw err;
  }

  const validationIssues = validateAbrechnung(abrechnung);
  const hasBlockingError = validationIssues.some(
    (issue) => issue.severity === 'error',
  );

  if (hasBlockingError) {
    return {
      ok: false,
      validationIssues,
      error: new Error('Validation failed: blocking errors present.'),
    };
  }

  const results = calculateAbrechnung(abrechnung);

  return {
    ok: true,
    validationIssues,
    results,
  };
}
