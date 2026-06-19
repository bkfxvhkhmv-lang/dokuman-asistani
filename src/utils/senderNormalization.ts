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

/** Utility issuers — checked before generic authority patterns (#189a). */
const UTILITY_RECOVERY_RES: RegExp[] = [
  /\b(wasserwerk\s+[\wÄÖÜäöüß-]{2,30})/i,
  /\b(gemeindewasserwerk\b)/i,
  /\b(stadtwerke\s+[\wÄÖÜäöüß-]{2,30})/i,
];

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
  /\b(stadt\s+\w[\w\s-]{0,20})/i,
  /\b(gemeinde\s+\w[\w\s-]{0,20})/i,
];

const COMPANY_LINE_RE =
  /([\wÄÖÜäöüß.&\-][\wÄÖÜäöüß.&\-'\s]{1,50}?\s+(?:GmbH(?:\s*&\s*Co\.\s*KG)?|AG|KG|UG|e\.?\s?K\.?|OHG|GbR)\b)/i;

const TITLE_ISSUER_PATTERNS: RegExp[] = [
  /\b(wasserwerk\s+[\wÄÖÜäöüß-]{2,30})/i,
  /\b(stadtwerke\s+[\wÄÖÜäöüß-]{2,30})/i,
  /\b(gemeindewasserwerk\b)/i,
  /([\wÄÖÜäöüß.&\-][\wÄÖÜäöüß.&\-'\s]{1,55}?\s+(?:GmbH(?:\s*&\s*Co\.\s*KG)?|AG|KG|UG|e\.?\s?K\.?|OHG|GbR))/i,
];

const GENERIC_TITLE_ONLY_RE =
  /^(?:schreiben(?:\s+von)?|dokument|sonstiges|brief|formular)(?:\s|$)/i;

export function isPaymentLikeDocumentTyp(typ?: string | null): boolean {
  const t = (typ ?? '').trim().toLowerCase();
  if (!t) return false;
  return /rechnung|mahnung|invoice|zahlung|beitrag|gebühr|versicherung/.test(t);
}

export function isAuthorityDocumentTyp(typ?: string | null): boolean {
  const t = (typ ?? '').trim().toLowerCase();
  if (!t) return false;
  return /behörde|behörden|amt|bescheid|finanzamt|steuer|jobcenter|gericht|versicherung.*bescheid/.test(t);
}

/** Footer/tax composite senders on vendor invoices — display demotion only (#189a). */
export function isLikelyTaxFooterSender(text: string, typ?: string | null): boolean {
  if (isAuthorityDocumentTyp(typ)) return false;
  const n = text.trim();
  if (!/\bfinanzamt\b/i.test(n)) return false;
  return /\bsteuer\s*nr\b|\bust\s*-?\s*id\b|\bustid\b|\bsteuernummer\b/i.test(n);
}

function isLikelyInvoiceRohText(rohText: string): boolean {
  const head = rohText.slice(0, 1200).toLowerCase();
  return /\b(rechnung|mahnung|rechnungsnummer|zahlungserinnerung|invoice)\b/.test(head);
}

function recoverCompanyFromRohText(rohText: string): string | null {
  const lines = rohText.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 15);
  for (const line of lines) {
    if (/finanzamt|steuer\s*nr|handelsregister|geschäftsführer|ust\s*-?\s*id/i.test(line)) continue;
    const match = line.match(COMPANY_LINE_RE);
    if (match?.[1]) {
      const cleaned = cleanRecovered(match[1]);
      if (cleaned) {
        const canonical = normalizeCanonical(cleaned);
        return canonical ?? cleaned;
      }
    }
  }
  return null;
}

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
export function recoverSenderFromRohText(
  rohText: string | null | undefined,
  typ?: string | null,
): string | null {
  if (!rohText?.trim()) return null;

  const invoiceCtx = isLikelyInvoiceRohText(rohText) || isPaymentLikeDocumentTyp(typ);

  // 1. Utility issuers (Wasserwerk, Stadtwerke, …)
  for (const re of UTILITY_RECOVERY_RES) {
    const m = rohText.match(re);
    if (m?.[1]) {
      const cleaned = cleanRecovered(m[1]);
      if (cleaned) return cleaned;
    }
  }

  // 2. Invoice header company before footer tax entities
  if (invoiceCtx) {
    const company = recoverCompanyFromRohText(rohText);
    if (company) return company;
  }

  // 3. Authority patterns — skip Finanzamt on vendor invoices
  for (const re of AUTHORITY_RECOVERY_RES) {
    if (invoiceCtx && /\bfinanzamt\b/i.test(re.source)) continue;
    const m = rohText.match(re);
    if (m?.[1]) {
      const cleaned = cleanRecovered(m[1]);
      if (cleaned) return cleaned;
    }
  }

  // 4. Canonical known brands in rohText
  for (const rule of CANONICAL_RULES) {
    if (rule.name && rule.pattern.test(rohText)) {
      return rule.name;
    }
  }

  return null;
}

/**
 * Conservative issuer inference from a strong title — display fallback only (#189a).
 * Returns null for generic titles (Schreiben, Sonstiges, Dokument ohne Issuer).
 */
export function inferSenderFromTitle(
  title: string | null | undefined,
  typ?: string | null,
): string | null {
  const t = (title ?? '').trim().replace(/\s+/g, ' ');
  if (t.length < 8) return null;
  if (/^schreiben von unbekannter absender/i.test(t)) return null;
  if (/^sonstiges(?:\s*[—–-]|\s|$)/i.test(t) && !/\b(gmbh|ag|wasserwerk|stadtwerke)\b/i.test(t)) return null;

  const hasIssuerSignal = TITLE_ISSUER_PATTERNS.some(re => re.test(t));
  if (GENERIC_TITLE_ONLY_RE.test(t) && !hasIssuerSignal) return null;

  for (const re of TITLE_ISSUER_PATTERNS) {
    const m = t.match(re);
    if (m?.[1]) {
      let cleaned = m[1].trim().replace(/\s*[·•|].*$/, '').trim();
      cleaned = cleaned.replace(/^(?:rechnung|mahnung|zahlungserinnerung)\s+/i, '').trim();
      if (cleaned.length >= 4 && cleaned.length <= 80) return cleaned;
    }
  }

  void typ;
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
  typ?: string | null,
): string {
  const raw = absender?.trim() ?? '';

  if (!raw || isWeakSender(raw)) {
    // Recovery path
    if (rohText) {
      const recovered = recoverSenderFromRohText(rohText, typ);
      if (recovered) return recovered;
    }
    return '';
  }

  // Normalization path: canonicalize if we know this brand
  const canonical = normalizeCanonical(raw);
  return canonical ?? raw;
}
