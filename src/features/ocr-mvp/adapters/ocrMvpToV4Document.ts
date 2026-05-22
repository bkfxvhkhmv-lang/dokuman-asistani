import type { Dokument } from '@/store/types';
import type { OcrMvpJobStatus, OcrMvpActionSummary } from '@/services/ocrMvpApi';
import { generateId } from '@/utils';
import { normalizeDocumentTyp } from '@/product/canonicalDocTypes';

// Opaque wrapper — store write happens in a separate step, never here.
export interface OcrMvpV4DocumentDraft {
  document: Dokument;
  source: 'ocr_mvp';
  originalResult: OcrMvpJobStatus;
}

// OCR MVP kind → V4 legacy typ string (normalizeDocumentTyp handles canonical resolution)
const KIND_TO_LEGACY: Record<string, string> = {
  invoice:    'Rechnung',    // → 'Rechnungen'
  settlement: 'Rechnung',    // → 'Rechnungen'
  form:       'Behörde',     // → 'Behörden / Amt'
  letter:     'Behörde',     // → 'Behörden / Amt'
  insurance:  'Versicherung',
  quote:      'Sonstiges',
  unknown:    'Sonstiges',
};

// Per-kind aktionen — only V4 canonical values; einspruch excluded by design.
// einspruch requires explicit risk/intent detection and a guarded flow — added later.
const KIND_TO_AKTIONEN: Record<string, string[]> = {
  invoice:    ['zahlen', 'kalender', 'review'],
  settlement: ['review', 'ai'],
  form:       ['review', 'ai'],
  letter:     ['ai', 'mail', 'kalender', 'review'],
  insurance:  ['ai', 'review', 'kalender'],
  quote:      ['review', 'ai'],
  unknown:    ['ai', 'review'],
};

function mapRisiko(raw: string | null | undefined): 'hoch' | 'mittel' | 'niedrig' {
  switch (raw?.toLowerCase().trim()) {
    case 'yuksek': case 'high':   return 'hoch';
    case 'orta':   case 'medium': return 'mittel';
    case 'dusuk':  case 'low':    return 'niedrig';
    default:                       return 'mittel';
  }
}

// Returns ISO string if parseable, null otherwise — unsafe formats are silently dropped.
function parseFrist(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const iso = new Date(raw);
  if (!isNaN(iso.getTime())) return iso.toISOString();

  // DD.MM.YYYY fallback (common in German documents)
  const match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

function resolveAbsender(kind: string, s: OcrMvpActionSummary | undefined): string {
  if (!s) return 'Unbekannt';
  // Invoices carry vendor_name; letters/insurance carry sender
  if (kind === 'invoice' || kind === 'settlement') {
    return s.vendor_name ?? s.sender ?? 'Unbekannt';
  }
  return s.sender ?? s.vendor_name ?? 'Unbekannt';
}

export function ocrMvpToV4Document(
  result: OcrMvpJobStatus,
  id?: string,
): OcrMvpV4DocumentDraft {
  const s = result.action_summary;
  const kind = result.document_type ?? 'unknown';

  const document: Dokument = {
    id:              id ?? generateId(),
    titel:           s?.title ?? 'Unbekanntes Dokument',
    typ:             normalizeDocumentTyp(KIND_TO_LEGACY[kind] ?? 'Sonstiges'),
    absender:        resolveAbsender(kind, s),
    zusammenfassung: s?.summary ?? null,
    warnung:         s?.warnings?.[0] ?? null,
    betrag:          s?.total_brutto ?? s?.amount ?? null,
    waehrung:        s?.currency ?? '€',
    frist:           parseFrist(s?.deadline ?? s?.due_date),
    risiko:          mapRisiko(s?.risk_level),
    aktionen:        KIND_TO_AKTIONEN[kind] ?? ['ai', 'review'],
    datum:           new Date().toISOString(),
    gelesen:         false,
    erledigt:        false,
    uri:             null,
    rohText:         null,
    iban:            s?.iban ?? null,
    confidence:      result.confidence ?? null,
    v4JobStatus:     'completed',
  };

  return { document, source: 'ocr_mvp', originalResult: result };
}
