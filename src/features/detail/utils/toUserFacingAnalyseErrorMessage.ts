import type { OcrMvpStatus } from '@/hooks/useOcrMvpJob';

const UNSUPPORTED_TYPE_MARKERS = [
  'desteklenmeyen dosya tipi',
  'unsupported file type',
  'unbekannter dateityp',
  'dateityp nicht erkannt',
  '.png, .jpeg, .jpg, .pdf',
  '.png,.jpeg,.jpg,.pdf',
];

const GENERIC_MESSAGE =
  'Die Analyse konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.';

export const UNSUPPORTED_FILE_TYPE_MESSAGE =
  'Dieses Dokument kann derzeit nicht analysiert werden. Der Dateityp konnte nicht erkannt werden. Bitte laden Sie eine PDF-, JPG- oder PNG-Datei erneut hoch.';

/**
 * Maps raw OCR/backend error text to a safe German user-facing message.
 * Keeps technical details out of the UI.
 */
export function toUserFacingAnalyseErrorMessage(
  error: string | null | undefined,
  status: OcrMvpStatus,
): string {
  if (!error && status === 'timeout') {
    return GENERIC_MESSAGE;
  }

  const normalized = (error ?? '').toLowerCase();

  // Backend returns Turkish/English unsupported-file-type messages depending on
  // the deployment. Treat any mention of the allowed-extension list or an
  // unsupported-type phrase as the same user-facing German message.
  if (
    UNSUPPORTED_TYPE_MARKERS.some(marker => normalized.includes(marker)) ||
    /\b400\b/.test(error ?? '') && normalized.includes('datei')
  ) {
    return UNSUPPORTED_FILE_TYPE_MESSAGE;
  }

  return GENERIC_MESSAGE;
}
