import type { OcrMvpActionSummary } from '@/services/ocrMvpApi';
export { humanizeTitle } from '@/utils/displaySanitizer';

// Filename-like patterns that are never meaningful document titles.
// scan[\s_]+\d covers "Scan 1780169901922" and "Scan_178..." (backend echoes file name as title).
const REJECT_TITLE_RE =
  /^(scan[\s_]?vom|scan[\s_]+\d|camscanner|scanbot|img_|dsc_|photo_|input|document|upload|belge|unknown|unbekannt)/i;

export function isMeaningfulTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const t = title.trim();
  if (t.length < 4) return false;
  if (REJECT_TITLE_RE.test(t)) return false;
  return true;
}

// ── German currency formatting ────────────────────────────────────────────────

const _deFormat = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGermanCurrency(
  value: number | string | null | undefined,
  currencyCode?: string | null,
): string | null {
  if (value == null) return null;

  let num: number;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    num = value;
  } else {
    const cleaned = value
      .replace(/EUR/gi, '')
      .replace(/€/g, '')
      .trim();

    // German notation: 1.234,56 → 1234.56
    if (/^-?\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
      num = Number(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      num = Number(cleaned);
    }
    if (!Number.isFinite(num)) return String(value);
  }

  const suffix = (currencyCode && currencyCode !== 'EUR') ? ` ${currencyCode}` : ' €';
  return _deFormat.format(num) + suffix;
}

const KIND_LABEL: Record<string, string> = {
  invoice:    'Rechnung',
  settlement: 'Nebenkostenabrechnung',
  letter:     'Behördenbrief',
  insurance:  'Versicherung',
  form:       'Formular',
  quote:      'Angebot',
  unknown:    'Dokument',
};

export function buildReadableKind(kind: string): string {
  return KIND_LABEL[kind] ?? 'Dokument';
}

function formatAmount(
  amount: number | null | undefined,
  currency: string | undefined,
): string | null {
  if (amount == null) return null;
  const cur = currency ?? '€';
  const n = Math.round(amount * 100) / 100;
  const [int, dec] = n.toFixed(2).split('.');
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intFormatted},${dec} ${cur}`;
}

const GERMAN_MONTHS: Record<string, string> = {
  januar:'01', februar:'02', märz:'03', april:'04',
  mai:'05', juni:'06', juli:'07', august:'08',
  september:'09', oktober:'10', november:'11', dezember:'12',
  // English fallback (LLM sometimes returns English)
  january:'01', february:'02', march:'03', june:'06',
  july:'07', october:'10', december:'12',
  jan:'01', feb:'02', mär:'03', mar:'03', apr:'04',
  jun:'06', jul:'07', aug:'08', sep:'09',
  okt:'10', oct:'10', nov:'11', dez:'12', dec:'12',
};

/** "März 2017" → "01.03.2017"  |  "24. Mai 2026" → "24.05.2026" */
function parseGermanMonthDate(raw: string): string | null {
  const t = raw.trim();
  // "24. März 2017" / "24 März 2017"
  const withDay = t.match(/^(\d{1,2})\.?\s+(\w+)\s+(\d{4})$/i);
  if (withDay) {
    const mm = GERMAN_MONTHS[withDay[2].toLowerCase()];
    if (mm) return `${withDay[1].padStart(2, '0')}.${mm}.${withDay[3]}`;
  }
  // "März 2017"
  const monthYear = t.match(/^(\w+)\s+(\d{4})$/i);
  if (monthYear) {
    const mm = GERMAN_MONTHS[monthYear[1].toLowerCase()];
    if (mm) return `01.${mm}.${monthYear[2]}`;
  }
  return null;
}

function formatDateForTitle(iso: string | null | undefined): string | null {
  if (!iso) return null;
  // ISO 8601 → DD.MM.YYYY
  const d = new Date(iso);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  }
  // DD.MM.YYYY passthrough
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(iso.trim())) return iso.trim();
  // DD.MM.YY → DD.MM.20YY (2-digit year, German documents)
  const shortYear = iso.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/);
  if (shortYear) return `${shortYear[1].padStart(2, '0')}.${shortYear[2].padStart(2, '0')}.20${shortYear[3]}`;
  // Only year — acceptable
  if (/^\d{4}$/.test(iso.trim())) return iso.trim();
  // German/English month names: "März 2017", "24. Mai 2026"
  const german = parseGermanMonthDate(iso);
  if (german) return german;
  return null;
}

/** Belge tarihi varsa onu kullan, yoksa bugünü (scan tarihi fallback). */
function titleDate(dokumentDatum: string | null | undefined): string {
  if (dokumentDatum) {
    const f = formatDateForTitle(dokumentDatum);
    if (f) return f;
  }
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

// Alanlar içinde belge tarihi — sadece güvenli eşleşmeler
const DATUM_FIELD_RE = /^(datum|date|rechnungsdatum|ausstellungsdatum|belegdatum|briefdatum|dokumentdatum)$/i;

export function extractDokumentDatum(s: OcrMvpActionSummary | undefined): string | null {
  if (!s) return null;
  // Direkt alanlar (öncelik sırası)
  const raw = s.invoice_date ?? s.document_date ?? null;
  if (raw?.trim()) return raw.trim();
  // Form fields içinde güvenli tarih alanı
  const match = (s.fields ?? []).find(f => DATUM_FIELD_RE.test(f.name.trim()));
  if (match?.value?.trim()) return match.value.trim();
  return null;
}

function formatDeadline(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `Frist ${dd}.${mm}`;
  }
  // DD.MM.YYYY fallback
  const m = deadline.match(/^(\d{1,2})\.(\d{1,2})/);
  if (m) return `Frist ${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}`;
  return null;
}

export function buildDocumentTitle(
  kind: string,
  s: OcrMvpActionSummary | undefined,
  dokumentDatum?: string | null,
): string {
  const label = buildReadableKind(kind);
  const dateStr = titleDate(dokumentDatum);

  switch (kind) {
    case 'invoice': {
      if (s?.vendor_name) {
        const parts = [s.vendor_name, label];
        const amt = formatAmount(s.total_brutto ?? s.amount, s.currency);
        if (amt) parts.push(amt);
        parts.push(dateStr);
        return parts.join(' · ');
      }
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return `${label} vom ${dateStr}`;
    }

    case 'settlement': {
      const entity = s?.vendor_name ?? s?.sender;
      if (entity) return `${entity} · ${label} · ${dateStr}`;
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return `${label} vom ${dateStr}`;
    }

    case 'letter': {
      if (s?.sender) {
        const parts = [s.sender, label, dateStr];
        return parts.join(' · ');
      }
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return `${label} vom ${dateStr}`;
    }

    case 'insurance': {
      if (s?.sender) {
        return `${s.sender} · ${label} · ${dateStr}`;
      }
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return `${label} vom ${dateStr}`;
    }

    case 'form': {
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      const sender = s?.sender ?? s?.vendor_name;
      if (sender) return `${sender} · ${label} · ${dateStr}`;
      return `${label} · ${dateStr}`;
    }

    case 'quote': {
      const entity = s?.vendor_name ?? s?.sender;
      if (entity) {
        const parts = [entity, label];
        const amt = formatAmount(s?.total_brutto ?? s?.amount, s?.currency);
        if (amt) parts.push(amt);
        parts.push(dateStr);
        return parts.join(' · ');
      }
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return `${label} vom ${dateStr}`;
    }

    default: {
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      const entity = s?.sender ?? s?.vendor_name;
      if (entity) return `${entity} · ${label} · ${dateStr}`;
      return `Dokument vom ${dateStr}`;
    }
  }
}

// Only fields that unambiguously name the sending organisation — never applicant/recipient fields.
// Note: "Empfänger" is intentionally excluded here; it requires institution-value validation (see below).
const SENDER_FIELD_RE =
  /^(absender|aussteller|beh[oö]rde|amt|unternehmen|firma|organisation|institution|anbieter|versicherung|dienstleister)/i;

// Payment/banking fields — never the document author, always excluded.
const PAYMENT_FIELD_RE =
  /^(bankname|bank$|kreditinstitut|kontoinhaber|zahlungsempf[äa]nger|iban|bic|kontonummer|blz)/i;

// "Empfänger" is only a sender signal in Behörden/form/letter context
// AND only when the value contains a clear institution keyword.
// "Empfänger: Bayram Gül" → never a sender. "Empfänger: Gemeinde Schmelz" → sender.
const _EMPFAENGER_FIELD_RE = /^empf[äa]nger$/i;
const _INSTITUTION_VALUE_RE =
  /\b(gemeinde|verbandsgemeinde|stadt(?:verwaltung)?|landkreis|kreis(?:verwaltung)?|landratsamt|finanzamt|zollamt|jobcenter|arbeitsamt|ordnungsamt|standesamt|rathaus|beh[oö]rde|polizei|bundesagentur|staatsanwaltschaft|amtsgericht)\b/i;
const _EMPFAENGER_KINDS = new Set(['form', 'letter', 'settlement']);
const _AUTHORITY_LINE_RE =
  /^(kreisjugendamt\s+[^\n,;]+|kreissozialamt\s+[^\n,;]+|kreisverwaltung\s+[^\n,;]+|landkreis\s+[^\n,;]+|kreis(?:verwaltung)?\s+[^\n,;]+|[^\n,;]*\b(?:gemeinde|verbandsgemeinde|stadt(?:verwaltung)?|landkreis|kreis(?:verwaltung)?|landratsamt|finanzamt|zollamt|jobcenter|arbeitsamt|ordnungsamt|standesamt|rathaus|beh[oö]rde|polizei|bundesagentur|staatsanwaltschaft|amtsgericht)\b[^\n,;]*)$/i;
const _AUTHORITY_DOMAIN_RE = /@([a-z0-9-]+)\.de\b/i;
const _COMPANY_LINE_RE =
  /^(?!.*\b(?:sachbearbeiter|telefon|tel\.?|fax|e-?mail|mail)\b)([^\n,;]*\b(?:gmbh|mbh|ag|kg|ug|e\.?\s?k\.?|ohg|gbr|gmbh\s*&\s*co\.?\s*kg|holding|group|versicherung)\b[^\n,;]*)$/i;
const _EMAIL_DOMAIN_RE = /@([a-z0-9-]+\.(?:de|com|net|org|eu))\b/i;

const MAX_SENDER_LENGTH = 80;

function cleanSenderCandidate(value: string): string | null {
  const v = value.trim().replace(/\s{2,}/g, ' ');
  if (!v || v.length > MAX_SENDER_LENGTH) return null;
  if (/^(herr|frau)\b/i.test(v)) return null;
  return v;
}

function extractAuthoritySenderFromRawText(rawText: string | null | undefined): string | null {
  if (!rawText?.trim()) return null;

  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/^(sachbearbeiter|sachbearbeiterin|sachbearbeiter\/in|telefon|tel\.?|fax|e-?mail|mail)\b/i.test(line)) continue;
    const match = line.match(_AUTHORITY_LINE_RE);
    if (match) return cleanSenderCandidate(match[1] ?? match[0]);
  }

  const domainMatch = rawText.match(_AUTHORITY_DOMAIN_RE);
  const host = domainMatch?.[1];
  if (!host) return null;
  const authorityHost = host.match(/^(kreis|landkreis)-([a-z0-9-]+)$/i);
  if (authorityHost?.[1] && authorityHost[2]) {
    const place = authorityHost[2]
      .split('-')
      .map(part => part ? part[0].toUpperCase() + part.slice(1) : part)
      .join(' ');
    return `${authorityHost[1] === 'landkreis' ? 'Landkreis' : 'Kreis'} ${place}`;
  }

  return null;
}

function companyFromDomain(host: string): string | null {
  const root = host
    .replace(/^(www|mail|service|info|kontakt|support|noreply)\./i, '')
    .split('.')[0]
    ?.trim();
  if (!root || root.length < 3) return null;
  if (/^(gmail|icloud|web|gmx|outlook|hotmail|yahoo|t-online)$/i.test(root)) return null;
  const name = root
    .split('-')
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(' ');
  return name || null;
}

function extractCompanySenderFromRawText(rawText: string | null | undefined): string | null {
  if (!rawText?.trim()) return null;
  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(_COMPANY_LINE_RE);
    if (match) {
      const cleaned = cleanSenderCandidate(match[1] ?? match[0]);
      if (cleaned) return cleaned;
    }
  }

  const domainHost = rawText.match(_EMAIL_DOMAIN_RE)?.[1];
  if (!domainHost) return null;
  return companyFromDomain(domainHost);
}

export function buildDocumentSender(
  kind: string,
  s: OcrMvpActionSummary | undefined,
): string {
  if (!s) return 'Unbekannt';

  const direct =
    kind === 'invoice' || kind === 'settlement'
      ? (s.vendor_name ?? s.sender)
      : (s.sender ?? s.vendor_name);

  if (direct?.trim()) return direct.trim();

  // Safe sender fields (Absender, Behörde, Firma, etc.)
  const match = (s.fields ?? []).find(
    f => SENDER_FIELD_RE.test(f.name.trim())
      && !PAYMENT_FIELD_RE.test(f.name.trim())
      && f.value.trim().length > 0,
  );
  if (match) {
    const v = match.value.trim();
    return v.length <= MAX_SENDER_LENGTH ? v : 'Unbekannt';
  }

  // "Empfänger" exception: only for Behörden/form/letter, only when value is clearly an institution.
  if (_EMPFAENGER_KINDS.has(kind)) {
    const empf = (s.fields ?? []).find(
      f => _EMPFAENGER_FIELD_RE.test(f.name.trim())
        && !PAYMENT_FIELD_RE.test(f.name.trim())
        && _INSTITUTION_VALUE_RE.test(f.value.trim()),
    );
    if (empf) {
      const v = empf.value.trim();
      return v.length <= MAX_SENDER_LENGTH ? v : 'Unbekannt';
    }
  }

  if (_EMPFAENGER_KINDS.has(kind)) {
    const rawTextSender = extractAuthoritySenderFromRawText(s.raw_text);
    if (rawTextSender) return rawTextSender;
  }

  const rawTextCompanySender = extractCompanySenderFromRawText(s.raw_text);
  if (rawTextCompanySender) return rawTextCompanySender;

  return 'Unbekannt';
}
