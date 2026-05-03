/**
 * Display-only sanitization for OCR-extracted fields.
 * Never modifies stored data — only what the user sees in cards/lists.
 */

function isLikelyGarbled(s: string): boolean {
  const t = s.trim();
  if (t.length <= 2) return true;
  if (/^(null|undefined|n\/a|error|unknown|none)$/i.test(t)) return true;
  const letterRatio = (t.match(/[a-zA-ZäöüÄÖÜß]/g) ?? []).length / t.length;
  if (letterRatio < 0.35) return true;
  // Short all-caps token with no spaces — looks like an OCR fragment, not a real name
  if (/^[A-Z0-9]{3,8}$/.test(t)) return true;
  return false;
}

/**
 * Returns a safe display value for `absender`.
 * Falls back to "Unbekannter Absender" for empty, garbled, or very low-confidence values.
 */
export function safeDisplayAbsender(
  absender: string | null | undefined,
  confidence?: number | null,
): string {
  if (!absender || absender.trim().length === 0) return 'Unbekannter Absender';
  if (confidence !== null && confidence !== undefined && confidence < 0.45) {
    return 'Unbekannter Absender';
  }
  if (isLikelyGarbled(absender)) return 'Unbekannter Absender';
  return absender.trim();
}
