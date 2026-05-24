import type { OcrMvpActionSummary } from '@/services/ocrMvpApi';

// Filename-like patterns that are never meaningful document titles.
const REJECT_TITLE_RE =
  /^(scan[\s_]?vom|camscanner|scanbot|img_|dsc_|photo_|input|document|upload|belge|unknown|unbekannt)/i;

export function isMeaningfulTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  const t = title.trim();
  if (t.length < 4) return false;
  if (REJECT_TITLE_RE.test(t)) return false;
  return true;
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
  // Only year — acceptable
  if (/^\d{4}$/.test(iso.trim())) return iso.trim();
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
const SENDER_FIELD_RE =
  /^(absender|aussteller|beh[oö]rde|amt|unternehmen|firma|organisation|institution|anbieter|versicherung|bank|krankenkasse|dienstleister)/i;

const MAX_SENDER_LENGTH = 80;

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

  const match = (s.fields ?? []).find(
    f => SENDER_FIELD_RE.test(f.name.trim()) && f.value.trim().length > 0,
  );
  if (match) {
    const v = match.value.trim();
    return v.length <= MAX_SENDER_LENGTH ? v : 'Unbekannt';
  }

  return 'Unbekannt';
}
