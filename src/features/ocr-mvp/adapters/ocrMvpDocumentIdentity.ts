import type { OcrMvpActionSummary } from '@/services/ocrMvpApi';

// Filename-like patterns that are never meaningful document titles.
const REJECT_TITLE_RE =
  /^(scan\s?vom|camscanner|img_|dsc_|photo|input(\.|$)|document|upload|belge|unknown|unbekannt)/i;

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
      return label;
    }

    case 'settlement': {
      const entity = s?.vendor_name ?? s?.sender;
      if (entity) return `${entity} · ${label}`;
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return label;
    }

    case 'letter': {
      if (s?.sender) {
        const parts = [s.sender, label];
        const dl = formatDeadline(s.deadline);
        if (dl) parts.push(dl);
        return parts.join(' · ');
      }
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return label;
    }

    case 'insurance': {
      if (s?.sender) {
        const parts = [s.sender, label];
        const dl = formatDeadline(s.deadline);
        if (dl) parts.push(dl);
        return parts.join(' · ');
      }
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return label;
    }

    case 'form': {
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      return s?.fields_count ? `${label} · ${s.fields_count} Felder` : label;
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
      return label;
    }

    default: {
      if (isMeaningfulTitle(s?.title)) return s!.title!.trim();
      const entity = s?.sender ?? s?.vendor_name;
      if (entity) return `${entity} · ${label}`;
      return 'Unbenanntes Dokument';
    }
  }
}

export function buildDocumentSender(
  kind: string,
  s: OcrMvpActionSummary | undefined,
): string {
  if (!s) return 'Unbekannt';
  if (kind === 'invoice' || kind === 'settlement') {
    return s.vendor_name ?? s.sender ?? 'Unbekannt';
  }
  return s.sender ?? s.vendor_name ?? 'Unbekannt';
}
