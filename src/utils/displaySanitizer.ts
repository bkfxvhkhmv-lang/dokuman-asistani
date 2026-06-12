/**
 * Display-only sanitization for OCR-extracted fields.
 * Never modifies stored data — only what the user sees in cards/lists.
 */
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';
import { normalizeSender } from '@/utils/senderNormalization';

// ── Title humanization (shared across app) ───────────────────────────────────

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text).normalize('NFC');
  } catch {
    return text.normalize('NFC');
  }
}

const FILE_EXT_RE = /\.(pdf|jpg|jpeg|png|xlsx|csv|docx|doc|txt)$/i;

const TECH_FILENAME_MAP: { re: RegExp; label: string }[] = [
  { re: /^image_\d+$/i,       label: 'display.fallback.from_photos' },
  { re: /^photo_\d+$/i,       label: 'display.fallback.photo_taken' },
  { re: /^IMG[_-]?\d+$/i,     label: 'display.fallback.image_selected' },
  { re: /^input(_full)?$/i,   label: 'display.fallback.analyzed_document' },
  { re: /^Scan\s+\d{6,}$/i,   label: 'display.fallback.analyzed_document' },
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
  const lang = getLangSync();
  let text = safeDecode(raw.trim());
  text = text.replace(FILE_EXT_RE, '');
  for (const { re, label } of TECH_FILENAME_MAP) {
    if (re.test(text)) return t(lang, label);
  }
  text = text.replace(TECH_SUFFIX_RE, '');
  text = text.replace(/[_-]/g, ' ');
  for (const [re, expanded] of ABBREV_MAP) {
    text = text.replace(re, expanded);
  }
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length < 3) return null;
  // Apply conservative OCR title cleanup before final casing
  const sanitized = sanitizeOcrTitleRaw(text);
  return toTitleCase(sanitized);
}

// ── Export-safe document title ────────────────────────────────────────────────

/**
 * Decodes URL-encoded document titles for display in export PDFs.
 * Only decodes and normalizes — does not infer missing spaces or reformat.
 */
export function safeDisplayDocumentTitleForExport(value: string | null | undefined): string {
  const lang = getLangSync();
  if (!value || value.trim().length === 0) return t(lang, 'display.fallback.unknown_document');
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { decoded = value; }
  const normalized = decoded.normalize('NFC').replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : t(lang, 'display.fallback.unknown_document');
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
 * Returns a safe, normalized display value for `absender`.
 * - Returns '' for empty, garbled, or placeholder values.
 * - Normalizes known brand names ("VODAFONE GmbH" → "Vodafone").
 * - Recovers a sender from `rohText` when absender is weak/missing.
 * Never modifies stored data.
 */
export function safeDisplayAbsender(
  absender: string | null | undefined,
  confidence?: number | null,
  rohText?: string | null,
): string {
  const raw = absender?.trim() ?? '';
  if (raw && isLikelyGarbled(raw)) return '';
  return normalizeSender(raw || null, rohText);
}

// ── AI Labeler display resolvers ─────────────────────────────────────────────

/**
 * Resolves the effective display title applying the priority chain:
 *   customTitle > aiDisplayTitle > titel
 *
 * customTitle (user-entered) always wins. aiDisplayTitle (AI-suggested,
 * accepted by user) beats the raw OCR titel. Neither overwrites each other
 * in the store — only the display priority is adjusted here.
 */
export function resolveDocumentTitle(dok: {
  titel: string;
  typ?: string | null;
  confidence?: number | null;
  customTitle?: string | null;
  aiDisplayTitle?: string;
}): string {
  // customTitle and aiDisplayTitle are already clean user/AI strings —
  // bypass OCR humanization (which would mangle hyphens, apply title-case, etc.)
  if (dok.customTitle?.trim()) return dok.customTitle.trim();
  if (dok.aiDisplayTitle?.trim()) return dok.aiDisplayTitle.trim();
  // Raw OCR titel goes through full sanitization pipeline
  return safeDisplayTitel(dok.titel, dok.typ, dok.confidence);
}

/**
 * Resolves the effective sender for display applying the priority chain:
 *   aiSender (accepted by user) > normalized absender / rohText recovery
 *
 * aiSender is only used when the user accepted a suggestion via Übernehmen.
 */
export function resolveDocumentSender(dok: {
  absender: string;
  confidence?: number | null;
  rohText?: string | null;
  aiSender?: string;
}): string {
  if (dok.aiSender?.trim()) return dok.aiSender.trim();
  return safeDisplayAbsender(dok.absender, dok.confidence, dok.rohText);
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
  const lang = getLangSync();
  if (!titel || titel.trim().length === 0) return typ || t(lang, 'display.fallback.unknown_document');
  if (confidence !== null && confidence !== undefined && confidence < 45) {
    return typ || t(lang, 'display.fallback.unknown_document');
  }
  // Stored scan IDs (e.g. "Scan 1780169901922") — use document type as title instead.
  if (/^Scan[\s_]+\d{6,}$/i.test(titel.trim())) {
    const trimmedTyp = typ?.trim();
    return (trimmedTyp && !/^unbekannt$/i.test(trimmedTyp)) ? trimmedTyp : t(lang, 'display.fallback.new_document');
  }
  const humanized = humanizeTitle(titel);
  const candidate = (humanized ?? titel.trim()).trim();
  if (RESERVED_DISPLAY_TITLES.has(candidate.toLowerCase())) {
    return typ || t(lang, 'display.fallback.unknown_document');
  }
  if (GENERIC_DATE_ONLY_RE.test(candidate)) {
    const fallbackTyp = typ?.trim();
    if (fallbackTyp && fallbackTyp.length > 0 && !/^unbekannt$/i.test(fallbackTyp)) {
      return fallbackTyp;
    }
    return t(lang, 'display.fallback.new_document');
  }
  return candidate;
}

// ── OCR title sanitizer ───────────────────────────────────────────────────────
// Conservative cleanup for display only. Never touches customTitle/aiDisplayTitle.

/** Matches a 5-digit German postal code anywhere in the string. */
const PLZ_IN_ADDRESS_RE = /\s+\S*\b\d{5}\b.*/;

/** Matches legal boilerplate "X ist eine Marke der Y" — OCR footer text leaking into title. */
const LEGAL_BOILERPLATE_RE = /\s+ist\s+eine\s+Marke\s+der\b.*/i;

/** Internal version operating on already-decoded raw strings (used in humanizeTitle). */
function sanitizeOcrTitleRaw(t: string): string {
  let result = t;
  if (LEGAL_BOILERPLATE_RE.test(result)) {
    result = result.replace(LEGAL_BOILERPLATE_RE, '').trim();
  }
  if (result.length > 40 && /\b\d{5}\b/.test(result)) {
    const stripped = result.replace(PLZ_IN_ADDRESS_RE, '').trim();
    if (stripped.length > 3 && stripped.length < result.length) result = stripped;
  }
  return result || t;
}

/**
 * Sanitize an OCR-generated title for display.
 * - Strips address tails when title > 40 chars AND contains a 5-digit German PLZ.
 * - Strips legal boilerplate "ist eine Marke der ...".
 * - Never shortens legitimate organization names without evidence.
 * - Returns null/undefined unchanged.
 */
export function sanitizeOcrTitle(title: string | null | undefined): string | null | undefined {
  if (!title) return title;
  let result = title;

  // Legal boilerplate guard (sim.de / Drillisch pattern)
  if (LEGAL_BOILERPLATE_RE.test(result)) {
    result = result.replace(LEGAL_BOILERPLATE_RE, '').trim();
  }

  // PLZ address-tail guard (Pflanzhits GmbH + street + PLZ + city)
  if (result.length > 40 && /\b\d{5}\b/.test(result)) {
    const stripped = result.replace(PLZ_IN_ADDRESS_RE, '').trim();
    // Only accept if stripping actually shortened and left something meaningful
    if (stripped.length > 3 && stripped.length < result.length) {
      result = stripped;
    }
  }

  return result || title;
}
