/** German locale input/display helpers for edit forms (display ≠ store). */

export const GERMAN_DATE_PLACEHOLDER = 'TT.MM.JJJJ';

function isValidYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  return !Number.isNaN(Date.parse(ymd));
}

/** ISO / YYYY-MM-DD → DD.MM.YYYY for display and edit inputs. */
export function formatIsoToGermanDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const trimmed = iso.trim();
  const isoPrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoPrefix) {
    return `${isoPrefix[3]}.${isoPrefix[2]}.${isoPrefix[1]}`;
  }
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getUTCFullYear()}`;
}

/** Parse DD.MM.YYYY or YYYY-MM-DD → canonical YYYY-MM-DD, or null if invalid/empty. */
export function parseGermanDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isValidYmd(trimmed) ? trimmed : null;
  }
  const deMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed);
  if (!deMatch) return null;
  const ymd = `${deMatch[3]}-${deMatch[2].padStart(2, '0')}-${deMatch[1].padStart(2, '0')}`;
  return isValidYmd(ymd) ? ymd : null;
}

/** Semantic date key for dirty-check (avoids ISO vs DE false positives). */
export function normalizeDateForCompare(value: string): string {
  return parseGermanDateInput(value) ?? '';
}

/** Amount for edit input — no currency suffix (label carries €). */
export function formatAmountForEditInput(betrag: number): string {
  if (!Number.isFinite(betrag)) return '';
  return betrag.toFixed(2).replace('.', ',');
}

/** Parse German or dot-decimal amount text → number, or null. */
export function parseAmountForStore(value: string): number | null {
  const trimmed = value.trim().replace(/[€\s]/g, '');
  if (!trimmed) return null;
  let normalized: string;
  if (trimmed.includes(',')) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+\.\d+$/.test(trimmed)) {
    normalized = trimmed;
  } else {
    normalized = trimmed.replace(/\./g, '');
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Semantic amount key for dirty-check. */
export function normalizeAmountForCompare(value: string): string {
  const n = parseAmountForStore(value);
  return n === null ? '' : n.toFixed(2);
}
