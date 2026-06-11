/**
 * D-3.2b — Guidance Builder
 *
 * Translates domain ValidationIssues into role-specific guidance.
 * Pure function. No calculation. No mutation. No UI.
 */

import type { ValidationIssue, UnitCalculationResult } from '@/features/vermieter/nebenkosten/domain';
import type { NkGuidanceResult, NkRole } from './types';
import { warningMessageForRole } from './warningMessageForRole';
import { nextStepsForRole } from './nextStepsForRole';

export function buildNkGuidance(
  role: NkRole,
  validationIssues: ValidationIssue[],
  results?: UnitCalculationResult[],
): NkGuidanceResult {
  const items = validationIssues.map((issue) => ({
    code: issue.code,
    severity: issue.severity,
    messageDe: warningMessageForRole(role, issue),
    nextStepsDe: nextStepsForRole(role, issue),
    refId: issue.refId,
  }));

  const hasBlockingErrors = items.some((item) => item.severity === 'error');

  return {
    role,
    items,
    hasBlockingErrors,
    results,
  };
}
