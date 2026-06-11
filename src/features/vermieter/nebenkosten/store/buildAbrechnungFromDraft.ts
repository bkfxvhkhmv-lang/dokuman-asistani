/**
 * D-3.2a — Store-Domain Wiring Adapter
 *
 * Maps the in-memory draft state to a NebenkostenAbrechnung domain object.
 * No side effects, no mutation, no UI.
 */

import type { NebenkostenAbrechnung } from '@/features/vermieter/nebenkosten/domain';
import type { NebenkostenDraftState } from './types';

export type DraftBuildErrorCode =
  | 'MISSING_LANDLORD'
  | 'MISSING_PROPERTY'
  | 'MISSING_BILLING_PERIOD';

export class DraftBuildError extends Error {
  code: DraftBuildErrorCode;

  constructor(code: DraftBuildErrorCode) {
    const message = messageForCode(code);
    super(message);
    this.name = 'DraftBuildError';
    this.code = code;
  }
}

function messageForCode(code: DraftBuildErrorCode): string {
  switch (code) {
    case 'MISSING_LANDLORD':
      return 'Vermieter fehlt.';
    case 'MISSING_PROPERTY':
      return 'Grundstück/Immobilie fehlt.';
    case 'MISSING_BILLING_PERIOD':
      return 'Abrechnungszeitraum fehlt.';
    default:
      return 'Unbekannter Draft-Build-Fehler.';
  }
}

export function buildAbrechnungFromDraft(
  state: NebenkostenDraftState,
): NebenkostenAbrechnung {
  if (state.landlord === null) {
    throw new DraftBuildError('MISSING_LANDLORD');
  }

  if (state.property === null) {
    throw new DraftBuildError('MISSING_PROPERTY');
  }

  if (state.billingPeriod === null) {
    throw new DraftBuildError('MISSING_BILLING_PERIOD');
  }

  return {
    id: 'draft',
    property: state.property,
    landlord: state.landlord,
    billingPeriod: state.billingPeriod,
    units: state.units,
    tenancies: state.tenancies,
    costPositions: state.costPositions,
    createdAt: '1970-01-01',
  };
}
