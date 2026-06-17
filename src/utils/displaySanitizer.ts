/**
 * Display-only sanitization for OCR-extracted fields.
 * Never modifies stored data — only what the user sees in cards/lists.
 */
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

/**
 * Matches trailing hash-like tokens such as `980880e7` or `1044f560`.
 * Requires at least one hex letter (a-f) to avoid stripping plain numeric
 * amounts, dates, or postal codes. Applied after `_` / `-` → space folding.
 */
const HASH_SUFFIX_RE = /\s+(?=[0-9a-f]*[a-f])[0-9a-f]{6,}$/i;

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

const UNKNOWN_TYPE_RE = /^unbekannt(?:es)?(?: dokument)?$/i;
const PAGE_ONLY_RE = /^page[\s_-]*\d+$/i;
const FOOTER_TITLE_PATTERNS: RegExp[] = [
  /^vorsitzender des aufsichtsrats\b/i,
  /^vorstand\b/i,
  /^handelsregister\b/i,
  /(?:telefon(?:nummer)?|(?:tele)?nummer|ummer)\s+f[üu]r\s+r[üu]ckfragen/i,
  /^f[üu]r\s+r[üu]ckfragen\b/i,
];

// Same patterns applied to sender field — footer/legal lines should never be displayed as Absender.
const FOOTER_SENDER_PATTERNS: RegExp[] = [
  /^vorsitzender\s+des\s+aufsichtsrats\b/i,
  /^vorstand\b/i,
  /^handelsregister\b/i,
  /(?:telefon(?:nummer)?|(?:tele)?nummer|ummer)\s+f[üu]r\s+r[üu]ckfragen/i,
  /^f[üu]r\s+r[üu]ckfragen\b/i,
  /^geschäftsführer\b/i,
  /^aufsichtsrat\b/i,
  /^vertretungsberechtigt\b/i,
];

// "{KindLabel} vom DD.MM.YYYY" or "Formular · DD.MM.YYYY" — no meaningful identity.
const GENERIC_DATE_ONLY_RE =
  /^(?:Dokument|Rechnung|Nebenkostenabrechnung|Behördenbrief|Versicherung|Formular|Angebot)(?: vom | · )\d{1,2}\.\d{1,2}(?:\.\d{4})?$/;

/** OCR reference labels glued to long numeric IDs — display-only reject (#129A). */
const REF_LABEL_ID_RE =
  /\b(kundeninfo|kundennummer|vertragsnummer|referenz|nr\.?|code|id)\s*\d{5,}\b/i;

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

function getDisplayLang(): string {
  try {
    const mod = require('@/i18n/langStore') as { getLangSync?: () => string };
    return mod.getLangSync?.() ?? 'de';
  } catch {
    return 'de';
  }
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function getSafeTypeLabel(typ?: string | null): string | null {
  const candidate = normalizeWhitespace(typ ?? '');
  if (!candidate || UNKNOWN_TYPE_RE.test(candidate)) return null;
  return candidate;
}

function formatDisplayDate(date?: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = String(parsed.getFullYear());
  return `${day}.${month}.${year}`;
}

function buildShortId(id?: string | null): string | null {
  const s = id?.trim() ?? '';
  if (s.length < 4) return null;
  return s.slice(-4).toUpperCase();
}

export function isLikelyBadDocumentTitle(text: string): boolean {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return true;
  if (PAGE_ONLY_RE.test(normalized)) return true;
  if (RESERVED_DISPLAY_TITLES.has(normalized.toLowerCase())) return true;
  if (GENERIC_DATE_ONLY_RE.test(normalized)) return true;
  if (REF_LABEL_ID_RE.test(normalized)) return true;
  return FOOTER_TITLE_PATTERNS.some(re => re.test(normalized));
}

export function isLikelyBadDocumentSender(text: string): boolean {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return true;
  return FOOTER_SENDER_PATTERNS.some(re => re.test(normalized));
}

function buildSafeDocumentTitleFallback(input: {
  typ?: string | null;
  absender?: string | null;
  rohText?: string | null;
  datum?: string | null;
  createdAt?: string | null;
  id?: string | null;
}): string {
  const lang = getDisplayLang();
  const rawType = getSafeTypeLabel(input.typ);
  // "Sonstiges" is not informative enough to distinguish documents — treat as no type.
  const typeLabel = (rawType && rawType !== 'Sonstiges') ? rawType : null;
  const displayLabel = typeLabel ?? t(lang, 'display.fallback.document');
  const dateStr = formatDisplayDate(input.createdAt) ?? formatDisplayDate(input.datum);
  const shortId = buildShortId(input.id);

  const parts: string[] = [displayLabel];
  if (dateStr) parts.push(dateStr);
  if (shortId) parts.push(shortId);
  return parts.join(' · ');
}

export function humanizeTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lang = getDisplayLang();
  let text = safeDecode(raw.trim());
  text = text.replace(FILE_EXT_RE, '');
  for (const { re, label } of TECH_FILENAME_MAP) {
    if (re.test(text)) return t(lang, label);
  }
  text = text.replace(/[_-]/g, ' ');
  text = text.replace(HASH_SUFFIX_RE, '');
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
  const lang = getDisplayLang();
  if (!value || value.trim().length === 0) return t(lang, 'display.fallback.unknown_document');
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { decoded = value; }
  const normalized = decoded.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!normalized.length) return t(lang, 'display.fallback.unknown_document');
  if (isLikelyBadDocumentTitle(normalized)) return t(lang, 'display.fallback.unknown_document');
  return normalized;
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
  if (raw && isLikelyBadDocumentSender(raw)) {
    // Footer/legal stored sender: try to recover a real sender from raw text before giving up.
    if (rohText) {
      const recovered = normalizeSender(null, rohText);
      if (recovered) return recovered;
    }
    return '';
  }
  return normalizeSender(raw || null, rohText);
}

// ── Weak / strong titel classification (#142A) ───────────────────────────────

/** Future #142B offline fallback titles — weak so AI/display can supersede. */
const OFFLINE_FALLBACK_TITLE_RE =
  /^\d{4}-\d{2}-\d{2}\s*·\s*(Scan|PDF|Foto)\s+\d{2}$/i;

/**
 * True when raw `titel` is generic, placeholder, or otherwise not meaningful
 * enough to beat `aiDisplayTitle` in the display chain.
 */
export function isWeakTitle(titel: string | null | undefined): boolean {
  const raw = normalizeWhitespace(safeDecode(titel ?? ''));
  if (!raw || raw.length < 3) return true;
  if (/^Sonstiges\s*[—–-]\s*/i.test(raw)) return true;
  if (/^Scan\s+vom\s+/i.test(raw)) return true;
  if (/^Wird\s+analysiert/i.test(raw)) return true;
  if (/^Scan[\s_]+\d{6,}$/i.test(raw)) return true;
  if (OFFLINE_FALLBACK_TITLE_RE.test(raw)) return true;
  const withoutExt = raw.replace(FILE_EXT_RE, '');
  for (const { re } of TECH_FILENAME_MAP) {
    if (re.test(withoutExt)) return true;
  }
  if (isLikelyBadDocumentTitle(raw)) return true;
  return false;
}

export function isStrongTitle(titel: string | null | undefined): boolean {
  return !isWeakTitle(titel);
}

// ── AI Labeler display resolvers ─────────────────────────────────────────────

/**
 * Resolves the effective display title applying the priority chain:
 *   customTitle > strong titel > aiDisplayTitle > fallback
 *
 * User `customTitle` always wins. Meaningful OCR `titel` beats AI suggestion.
 * Weak/generic `titel` yields to `aiDisplayTitle`. Neither overwrites the
 * other in the store — only display priority is adjusted here.
 */
export function resolveDocumentTitle(dok: {
  titel: string;
  typ?: string | null;
  confidence?: number | null;
  customTitle?: string | null;
  aiDisplayTitle?: string;
  absender?: string | null;
  rohText?: string | null;
  datum?: string | null;
  createdAt?: string | null;
  id?: string | null;
}): string {
  // customTitle and aiDisplayTitle are already clean user/AI strings —
  // bypass OCR humanization (which would mangle hyphens, apply title-case, etc.)
  const customTitle = normalizeWhitespace(safeDecode(dok.customTitle ?? ''));
  if (customTitle && !isLikelyBadDocumentTitle(customTitle)) return customTitle;

  const titelRaw = dok.titel ?? '';
  if (isStrongTitle(titelRaw)) {
    const candidate = safeDisplayTitel(titelRaw, dok.typ, dok.confidence);
    if (!isLikelyBadDocumentTitle(candidate)) return candidate;
  }

  const aiTitle = normalizeWhitespace(safeDecode(dok.aiDisplayTitle ?? ''));
  if (aiTitle && !isLikelyBadDocumentTitle(aiTitle)) return aiTitle;

  return buildSafeDocumentTitleFallback(dok);
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
  const lang = getDisplayLang();
  const fallbackType = getSafeTypeLabel(typ);
  if (!titel || titel.trim().length === 0) return fallbackType || t(lang, 'display.fallback.unknown_document');
  if (confidence !== null && confidence !== undefined && confidence < 45) {
    return fallbackType || t(lang, 'display.fallback.unknown_document');
  }
  // Stored scan IDs (e.g. "Scan 1780169901922") — use document type as title instead.
  if (/^Scan[\s_]+\d{6,}$/i.test(titel.trim())) {
    return fallbackType || t(lang, 'display.fallback.new_document');
  }
  const humanized = humanizeTitle(titel);
  const candidate = (humanized ?? titel.trim()).trim();
  if (isLikelyBadDocumentTitle(candidate)) {
    return fallbackType || t(lang, 'display.fallback.new_document');
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
