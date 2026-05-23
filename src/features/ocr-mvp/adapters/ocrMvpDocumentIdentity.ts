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

function todayFormatted(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
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
): string {
  const label = buildReadableKind(kind);

  switch (kind) {
    case 'invoice': {
      if (s?.vendor_name) {
        const parts = [s.vendor_name, label];
        const amt = formatAmount(s.total_brutto ?? s.amount, s.currency);
        if (amt) parts.push(amt);
        return parts.join(' · ');
      }
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return `${label} vom ${todayFormatted()}`;
    }

    case 'settlement': {
      const entity = s?.vendor_name ?? s?.sender;
      if (entity) return `${entity} · ${label}`;
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return `${label} vom ${todayFormatted()}`;
    }

    case 'letter': {
      if (s?.sender) {
        const parts = [s.sender, label];
        const dl = formatDeadline(s.deadline);
        if (dl) parts.push(dl);
        return parts.join(' · ');
      }
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return `${label} vom ${todayFormatted()}`;
    }

    case 'insurance': {
      if (s?.sender) {
        const parts = [s.sender, label];
        const dl = formatDeadline(s.deadline);
        if (dl) parts.push(dl);
        return parts.join(' · ');
      }
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return `${label} vom ${todayFormatted()}`;
    }

    case 'form': {
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      const today = todayFormatted();
      return s?.fields_count
        ? `${label} · ${s.fields_count} Felder · ${today}`
        : `${label} vom ${today}`;
    }

    case 'quote': {
      const entity = s?.vendor_name ?? s?.sender;
      if (entity) {
        const parts = [entity, label];
        const amt = formatAmount(s?.total_brutto ?? s?.amount, s?.currency);
        if (amt) parts.push(amt);
        return parts.join(' · ');
      }
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return `${label} vom ${todayFormatted()}`;
    }

    default: {
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      const entity = s?.sender ?? s?.vendor_name;
      if (entity) return `${entity} · ${label}`;
      return `Dokument vom ${todayFormatted()}`;
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
