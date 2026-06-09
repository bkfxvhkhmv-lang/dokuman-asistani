/**
 * Sender normalization utilities — display-only, never modifies stored data.
 *
 * Two concerns:
 *  A) Canonical normalization: "VODAFONE GmbH" → "Vodafone"
 *  B) Weak-sender recovery: absender="Unbekannt" + rohText has "Kreisjugendamt X" → "Kreisjugendamt X"
 */

// Stored values that should be treated as "no sender"
const WEAK_SENDER_SET = new Set([
  'unbekannt', 'unbekannter absender', 'unknown', 'unknown sender',
  'absender unbekannt', 'kein absender', 'n/a', '-', '—',
  'kundenservice', 'service center', 'servicecenter',
  'rechnung', 'mahnung', 'dokument',
  'die online-versicherung', // HUK24 generic brand — recovered via rohText/canonical
]);

/**
 * Returns true when the stored absender is a placeholder or generic label
 * that provides no real identity to the user.
 */
export function isWeakSender(raw: string | null | undefined): boolean {
  if (!raw || !raw.trim()) return true;
  return WEAK_SENDER_SET.has(raw.trim().toLowerCase());
}

// Canonical rules: ordered most-specific first.
// A null name means "don't overwrite — keep existing value".
const CANONICAL_RULES: { pattern: RegExp; name: string | null }[] = [
  // HUK — must come before generic insurance
  { pattern: /\bhuk.?24\b/i,                              name: 'HUK24' },
  { pattern: /online.versicherung/i,                       name: 'HUK24' },
  { pattern: /\bhuk.?coburg\b|\bhuk\s+coburg\b/i,         name: 'HUK-COBURG' },
  // Telecom
  { pattern: /vodafone/i,                                  name: 'Vodafone' },
  { pattern: /deutsche\s+telekom|telekom\s+deutschland|\bdtag\b/i, name: 'Deutsche Telekom' },
  { pattern: /\btelekom\b/i,                               name: 'Deutsche Telekom' },
  { pattern: /\bo2\b|telefónica/i,                         name: 'O2' },
  { pattern: /\b1&1\b|1\s*und\s*1\b/i,                    name: '1&1' },
  { pattern: /freenet/i,                                   name: 'Freenet' },
  // Energy
  { pattern: /\be\.on\b|\beon\b/i,                         name: 'E.ON' },
  { pattern: /\brwe\b/i,                                   name: 'RWE' },
  { pattern: /enbw/i,                                      name: 'EnBW' },
  { pattern: /vattenfall/i,                                name: 'Vattenfall' },
  // BWW Energie — matched only when "Energie" or clear energy context is present (conservative)
  { pattern: /\bbww\s+energie\b/i,                         name: 'BWW Energie' },
  // Health insurance
  { pattern: /techniker\s+krankenkasse/i,                  name: 'Techniker Krankenkasse' },
  { pattern: /barmer/i,                                    name: 'Barmer' },
  { pattern: /dak.gesundheit|\bdak\b/i,                    name: 'DAK' },
  { pattern: /\baok\b/i,                                   name: null }, // AOK Bayern etc. — keep regional suffix
  // Insurance
  { pattern: /allianz/i,                                   name: 'Allianz' },
  { pattern: /\baxa\b/i,                                   name: 'AXA' },
  { pattern: /\bergo\b/i,                                  name: 'ERGO' },
  { pattern: /\br\+v\b|r\s+und\s+v\b/i,                   name: 'R+V' },
  { pattern: /devk/i,                                      name: 'DEVK' },
  { pattern: /generali/i,                                  name: 'Generali' },
  { pattern: /zurich/i,                                    name: 'Zurich' },
  // Logistics
  { pattern: /\bdhl\b/i,                                   name: 'DHL' },
  { pattern: /deutsche\s+post/i,                           name: 'Deutsche Post' },
  // E-commerce / payment
  { pattern: /amazon/i,                                    name: 'Amazon' },
  { pattern: /paypal/i,                                    name: 'PayPal' },
  // Banks
  { pattern: /commerzbank/i,                               name: 'Commerzbank' },
  { pattern: /deutsche\s+bank/i,                           name: 'Deutsche Bank' },
  { pattern: /postbank/i,                                  name: 'Postbank' },
  { pattern: /volksbank|raiffeisen/i,                      name: 'Volksbank' },
];

/**
 * Maps a raw sender string to a canonical display name.
 * Returns null when no canonical rule matches (caller should use raw value).
 * Returns the raw value (trimmed) when the matching rule has name=null (e.g. "AOK Bayern").
 */
export function normalizeCanonical(raw: string): string | null {
  const trimmed = raw.trim();
  for (const rule of CANONICAL_RULES) {
    if (rule.pattern.test(trimmed)) {
      return rule.name ?? trimmed; // null name → keep existing (e.g. "AOK Bayern")
    }
  }
  return null;
}

// Authority patterns to try recovering a sender from OCR raw text.
// Each produces: match[0] = full match to use as display sender.
// Most specific patterns first (Kreisjugendamt before Kreis, etc.)
const AUTHORITY_RECOVERY_RES: RegExp[] = [
  /\b(kreisjugendamt\s+\w[\w\s-]{0,30})/i,
  /\b(kreissozialamt\s+\w[\w\s-]{0,30})/i,
  /\b(kreisverwaltung\s+\w[\w\s-]{0,30})/i,
  /\b(landratsamt\s+\w[\w\s-]{0,30})/i,
  /\b(landkreis\s+\w[\w\s-]{0,30})/i,
  /\b(jobcenter\s+\w[\w\s-]{0,30})/i,
  /\b(agentur\s+f[uü]r\s+arbeit\s+\w[\w\s-]{0,30})/i,
  /\b(finanzamt\s+\w[\w\s-]{0,30})/i,
  /\b(stadtwerke\s+\w[\w\s-]{0,30})/i,
  /\b(stadt\s+\w[\w\s-]{0,20})/i,
  /\b(gemeinde\s+\w[\w\s-]{0,20})/i,
];

// Personal-name prefixes — values starting with these are never a sender.
const PERSONAL_NAME_PREFIX_RE = /^(herr|frau|herrn|sehr geehrter|sehr geehrte)\b/i;

function cleanRecovered(value: string): string | null {
  const v = value.trim().replace(/\s{2,}/g, ' ');
  if (v.length < 4 || v.length > 80) return null;
  if (PERSONAL_NAME_PREFIX_RE.test(v)) return null;
  return v;
}

/**
 * Attempts to extract a sender name from OCR raw text when the stored
 * absender is weak or missing. Only returns high-confidence institution names.
 * Returns null if nothing usable is found.
 */
export function recoverSenderFromRohText(rohText: string | null | undefined): string | null {
  if (!rohText?.trim()) return null;

  // 1. Try authority patterns (Kreisjugendamt, Landkreis, Finanzamt, etc.)
  for (const re of AUTHORITY_RECOVERY_RES) {
    const m = rohText.match(re);
    if (m?.[1]) {
      const cleaned = cleanRecovered(m[1]);
      if (cleaned) return cleaned;
    }
  }

  // 2. Try canonical known brands in rohText
  for (const rule of CANONICAL_RULES) {
    if (rule.name && rule.pattern.test(rohText)) {
      return rule.name;
    }
  }

  return null;
}

/**
 * Returns the best display sender for a document.
 *
 * Logic:
 *  1. If absender is weak/empty → try recovery from rohText → fallback to ''
 *  2. If absender is present → apply canonical normalization
 *  3. Never overwrite a specific non-weak sender with a generic recovered value.
 */
export function normalizeSender(
  absender: string | null | undefined,
  rohText?: string | null,
): string {
  const raw = absender?.trim() ?? '';

  if (!raw || isWeakSender(raw)) {
    // Recovery path
    if (rohText) {
      const recovered = recoverSenderFromRohText(rohText);
      if (recovered) return recovered;
    }
    return '';
  }

  // Normalization path: canonicalize if we know this brand
  const canonical = normalizeCanonical(raw);
  return canonical ?? raw;
}
