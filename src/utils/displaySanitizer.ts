/**
 * Display-only sanitization for OCR-extracted fields.
 * Never modifies stored data — only what the user sees in cards/lists.
 */

// ── Title humanization (shared across app) ───────────────────────────────────

function safeDecode(text: string): string {
  try { return decodeURIComponent(text); } catch { return text; }
}

const FILE_EXT_RE = /\.(pdf|jpg|jpeg|png|xlsx|csv|docx|doc|txt)$/i;

const TECH_FILENAME_MAP: { re: RegExp; label: string }[] = [
  { re: /^image_\d+$/i,   label: 'Dokument aus Fotos' },
  { re: /^photo_\d+$/i,   label: 'Foto aufgenommen' },
  { re: /^IMG[_-]?\d+$/i, label: 'Bild ausgewählt' },
  { re: /^input(_full)?$/i, label: 'Analysiertes Dokument' },
];

const TECH_SUFFIX_RE = /_[a-z]{2}[0-9a-f]{4,}$/i;

const ABBREV_MAP: [RegExp, string][] = [
  [/\bsgb[\s_-]?ii\b/gi, 'SGB II'],
  [/\bsgb2\b/gi,         'SGB II'],
  [/\bgez\b/gi,          'GEZ'],
  [/\bkfz\b/gi,          'KFZ'],
  [/\baok\b/gi,          'AOK'],
];

const RESERVED_DISPLAY_TITLES = new Set([
  'angaben prüfen',
  'bis',
]);

function toTitleCase(text: string): string {
  return text
    .split(' ')
    .map(word => {
      if (!word) return '';
      if (word === word.toUpperCase() && word.length > 1) return word;
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function humanizeTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let t = safeDecode(raw.trim());
  t = t.replace(FILE_EXT_RE, '');
  for (const { re, label } of TECH_FILENAME_MAP) {
    if (re.test(t)) return label;
  }
  t = t.replace(TECH_SUFFIX_RE, '');
  t = t.replace(/[_-]/g, ' ');
  for (const [re, expanded] of ABBREV_MAP) {
    t = t.replace(re, expanded);
  }
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length < 3) return null;
  return toTitleCase(t);
}

// ── Export-safe document title ────────────────────────────────────────────────

/**
 * Decodes URL-encoded document titles for display in export PDFs.
 * Only decodes and normalizes — does not infer missing spaces or reformat.
 */
export function safeDisplayDocumentTitleForExport(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) return 'Unbekanntes Dokument';
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { decoded = value; }
  const normalized = decoded.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : 'Unbekanntes Dokument';
}

// ── Absender / Titel display sanitization ────────────────────────────────────

function isLikelyGarbled(s: string): boolean {
  const t = s.trim();
  if (t.length <= 2) return true;
  if (/^(null|undefined|n\/a|error|unknown|none)$/i.test(t)) return true;
  const letterRatio = (t.match(/[a-zA-ZäöüÄÖÜß]/g) ?? []).length / t.length;
  if (letterRatio < 0.35) return true;
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
  if (isLikelyGarbled(absender)) return 'Unbekannter Absender';
  return absender.trim();
}

/**
 * Returns a safe display value for `titel`.
 * Applies humanization (URL-decode, slug cleanup, tech-filename mapping).
 * Falls back to typ-based placeholder for low-confidence or empty titles.
 * Raw value remains available in detail/edit fields.
 */
export function safeDisplayTitel(
  titel: string | null | undefined,
  typ?: string | null,
  confidence?: number | null,
): string {
  if (!titel || titel.trim().length === 0) return typ || 'Unbekanntes Dokument';
  if (confidence !== null && confidence !== undefined && confidence < 45) {
    return typ || 'Unbekanntes Dokument';
  }
  const humanized = humanizeTitle(titel);
  const candidate = (humanized ?? titel.trim()).trim();
  if (RESERVED_DISPLAY_TITLES.has(candidate.toLowerCase())) {
    return typ || 'Unbekanntes Dokument';
  }
  return candidate;
}
