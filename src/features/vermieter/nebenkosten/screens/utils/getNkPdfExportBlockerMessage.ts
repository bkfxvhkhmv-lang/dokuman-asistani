import type { CalculationResult } from '@/features/vermieter/nebenkosten/store';
import type { NebenkostenDraftState } from '@/features/vermieter/nebenkosten/store/types';

const FALLBACK_VALIDATION_MESSAGE =
  'Die Abrechnung enthält noch Angaben, die vor dem PDF-Export ergänzt werden müssen.';

export function getNkPdfExportBlockerMessage(
  calcResult: CalculationResult,
  state: Pick<NebenkostenDraftState, 'landlord'>,
): string | null {
  if (state.landlord === null) {
    return 'Bitte ergänzen Sie zuerst die Vermieterangaben.';
  }

  if (!calcResult.ok) {
    const blockingIssue = calcResult.validationIssues.find(
      (issue) => issue.severity === 'error',
    );
    return (
      blockingIssue?.messageDe ||
      calcResult.error.message ||
      FALLBACK_VALIDATION_MESSAGE
    );
  }

  if (calcResult.results.length === 0) {
    return 'Es liegen noch keine berechneten Ergebnisse für den PDF-Export vor.';
  }

  return null;
}
