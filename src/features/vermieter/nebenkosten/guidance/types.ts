/**
 * D-3.2b — Nebenkosten Guidance Layer Types
 *
 * UI → guidance → domain
 * domain must never import guidance
 * guidance must never import React or UI
 */

import type { ValidationIssue, UnitCalculationResult } from '@/features/vermieter/nebenkosten/domain';

export type NkRole = 'mieter' | 'vermieter';

export interface NkGuidanceItem {
  code: string;
  severity: ValidationIssue['severity'];
  messageDe: string;
  nextStepsDe: string[];
  refId?: string;
}

export interface NkGuidanceResult {
  role: NkRole;
  items: NkGuidanceItem[];
  hasBlockingErrors: boolean;
  results?: UnitCalculationResult[];
}
