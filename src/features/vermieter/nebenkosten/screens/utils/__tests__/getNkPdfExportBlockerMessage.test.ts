import { getNkPdfExportBlockerMessage } from '@/features/vermieter/nebenkosten/screens/utils/getNkPdfExportBlockerMessage';
import type { CalculationResult } from '@/features/vermieter/nebenkosten/store';
import type { NebenkostenDraftState } from '@/features/vermieter/nebenkosten/store/types';
import type { Landlord, UnitCalculationResult } from '@/features/vermieter/nebenkosten/domain';

function makeLandlord(): Landlord {
  return {
    id: 'landlord-1',
    name: 'Vermieter GmbH',
    address: {
      street: 'Musterstraße',
      houseNumber: '1',
      postalCode: '12345',
      city: 'Berlin',
    },
  };
}

function makeState(landlord: Landlord | null): Pick<NebenkostenDraftState, 'landlord'> {
  return { landlord };
}

function makeErrorResult(
  issues: CalculationResult['validationIssues'],
  errorMessage?: string,
): Extract<CalculationResult, { ok: false }> {
  return {
    ok: false,
    validationIssues: issues,
    error: errorMessage ? new Error(errorMessage) : new Error('Validation failed'),
  };
}

function makeSuccessResult(
  results: UnitCalculationResult[] = [],
): Extract<CalculationResult, { ok: true }> {
  return {
    ok: true,
    validationIssues: [],
    results,
  };
}

describe('getNkPdfExportBlockerMessage', () => {
  it('returns messageDe for HEIZKOSTEN_VERBRAUCH_MISSING', () => {
    const calcResult = makeErrorResult([
      {
        code: 'HEIZKOSTEN_VERBRAUCH_MISSING',
        severity: 'error',
        messageDe: 'Verbrauchswerte fehlen für Heiz-/Warmwasserkosten. Bitte ergänzen.',
        scope: 'costPosition',
      },
    ]);
    const message = getNkPdfExportBlockerMessage(calcResult, makeState(makeLandlord()));
    expect(message).toBe(
      'Verbrauchswerte fehlen für Heiz-/Warmwasserkosten. Bitte ergänzen.',
    );
  });

  it('prefers the first error severity issue', () => {
    const calcResult = makeErrorResult([
      {
        code: 'WARN_CATEGORY_PRESENT',
        severity: 'warning',
        messageDe: 'Warnung.',
        scope: 'costPosition',
      },
      {
        code: 'NEGATIVE_COST',
        severity: 'error',
        messageDe: 'Kosten dürfen nicht negativ sein.',
        scope: 'costPosition',
      },
    ]);
    const message = getNkPdfExportBlockerMessage(calcResult, makeState(makeLandlord()));
    expect(message).toBe('Kosten dürfen nicht negativ sein.');
  });

  it('falls back to error.message when no issue messageDe', () => {
    const calcResult = makeErrorResult(
      [{ code: 'UNKNOWN', severity: 'error', messageDe: '', scope: 'abrechnung' }],
      'Custom calculation error',
    );
    const message = getNkPdfExportBlockerMessage(calcResult, makeState(makeLandlord()));
    expect(message).toBe('Custom calculation error');
  });

  it('returns neutral fallback when calc fails without message', () => {
    const calcResult = makeErrorResult(
      [{ code: 'UNKNOWN', severity: 'error', messageDe: '', scope: 'abrechnung' }],
    );
    calcResult.error = new Error('');
    const message = getNkPdfExportBlockerMessage(calcResult, makeState(makeLandlord()));
    expect(message).toBe(
      'Die Abrechnung enthält noch Angaben, die vor dem PDF-Export ergänzt werden müssen.',
    );
  });

  it('returns message when results are empty', () => {
    const calcResult = makeSuccessResult([]);
    const message = getNkPdfExportBlockerMessage(calcResult, makeState(makeLandlord()));
    expect(message).toBe('Es liegen noch keine berechneten Ergebnisse für den PDF-Export vor.');
  });

  it('returns message when landlord is missing', () => {
    const calcResult = makeSuccessResult();
    const message = getNkPdfExportBlockerMessage(calcResult, makeState(null));
    expect(message).toBe('Bitte ergänzen Sie zuerst die Vermieterangaben.');
  });

  it('returns null when there is no blocker', () => {
    const calcResult = makeSuccessResult([
      {
        unit: {} as UnitCalculationResult['unit'],
        tenancy: {} as UnitCalculationResult['tenancy'],
        billingPeriod: { startDate: '2024-01-01', endDate: '2024-12-31' },
        lineItems: [],
        sumTenantCostsCents: 10000,
        prepaymentTotalCents: 0,
        differenceCents: 10000,
        resultType: 'nachzahlung',
      },
    ]);
    const message = getNkPdfExportBlockerMessage(calcResult, makeState(makeLandlord()));
    expect(message).toBeNull();
  });
});
