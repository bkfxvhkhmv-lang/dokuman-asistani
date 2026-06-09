const TECHNICAL_ERROR_PATTERNS = [
  /network request failed/i,
  /failed to fetch/i,
  /network error/i,
  /abort/i,
  /timeout/i,
  /econnrefused/i,
  /enotfound/i,
  /socket/i,
];

/** Never surface raw fetch/transport strings in OCR import UI. */
export function isTechnicalOcrError(message: string | null | undefined): boolean {
  if (!message?.trim()) return false;
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function toUserFacingOcrMessage(
  message: string | null | undefined,
  T: (key: string) => string,
  fallbackKey = 'ocr.error.generic.body',
): string {
  if (isTechnicalOcrError(message)) {
    return T('ocr.error.network.body');
  }
  return T(fallbackKey);
}
