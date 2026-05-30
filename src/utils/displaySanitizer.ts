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
  { re: /^image_\d+$/i,       label: 'Dokument aus Fotos' },
  { re: /^photo_\d+$/i,       label: 'Foto aufgenommen' },
  { re: /^IMG[_-]?\d+$/i,     label: 'Bild ausgewählt' },
  { re: /^input(_full)?$/i,   label: 'Analysiertes Dokument' },
  { re: /^Scan\s+\d{6,}$/i,   label: 'Analysiertes Dokument' },
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

// "{KindLabel} vom DD.MM.YYYY" or "Formular · DD.MM.YYYY" — no meaningful identity.
const GENERIC_DATE_ONLY_RE =
  /^(?:Dokument|Rechnung|Nebenkostenabrechnung|Behördenbrief|Versicherung|Formular|Angebot)(?: vom | · )\d{1,2}\.\d{1,2}(?:\.\d{4})?$/;

const LOWERCASE_WORDS = new Set(['vom', 'von', 'am', 'im', 'an', 'auf', 'bei', 'zu', 'mit', 'und', 'der', 'die', 'das', 'den', 'dem', 'oder', 'für']);

function toTitleCase(text: string): string {
  return text
    .split(' ')
    .map((word, i) => {
      if (!word) return '';
      if (word === word.toUpperCase() && word.length > 1) return word;
      if (i > 0 && LOWERCASE_WORDS.has(word.toLowerCase())) return word.toLowerCase();
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

const ABSENDER_PLACEHOLDERS = new Set([
  'unbekannt', 'unbekannter absender', 'unknown', 'unknown sender',
  'absender unbekannt', 'kein absender', 'n/a', '-', '—',
]);

/**
 * Returns a safe display value for `absender`.
 * Returns '' for empty, garbled, or known placeholder values so callers
 * can omit the sender label entirely rather than showing "Unbekannt".
 */
export function safeDisplayAbsender(
  absender: string | null | undefined,
  confidence?: number | null,
): string {
  if (!absender || absender.trim().length === 0) return '';
  if (isLikelyGarbled(absender)) return '';
  if (ABSENDER_PLACEHOLDERS.has(absender.trim().toLowerCase())) return '';
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
  // Stored scan IDs (e.g. "Scan 1780169901922") — use document type as title instead.
  if (/^Scan[\s_]+\d{6,}$/i.test(titel.trim())) {
    const t = typ?.trim();
    return (t && !/^unbekannt$/i.test(t)) ? t : 'Neues Dokument';
  }
  const humanized = humanizeTitle(titel);
  const candidate = (humanized ?? titel.trim()).trim();
  if (RESERVED_DISPLAY_TITLES.has(candidate.toLowerCase())) {
    return typ || 'Unbekanntes Dokument';
  }
  if (GENERIC_DATE_ONLY_RE.test(candidate)) {
    const fallbackTyp = typ?.trim();
    if (fallbackTyp && fallbackTyp.length > 0 && !/^unbekannt$/i.test(fallbackTyp)) {
      return fallbackTyp;
    }
    return 'Neues Dokument';
  }
  return candidate;
}
