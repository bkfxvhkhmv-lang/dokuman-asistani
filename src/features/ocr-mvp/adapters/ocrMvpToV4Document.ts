import type { Dokument, ScannedPage } from '@/store/types';
import type { OcrMvpJobStatus } from '@/services/ocrMvpApi';
import { generateId } from '@/utils';
import { normalizeDocumentTyp } from '@/product/canonicalDocTypes';
import { buildDocumentTitle, buildDocumentSender, extractDokumentDatum } from './ocrMvpDocumentIdentity';

// Opaque wrapper — store write happens in a separate step, never here.
export interface OcrMvpV4DocumentDraft {
  document: Dokument;
  source: 'ocr_mvp';
  originalResult: OcrMvpJobStatus;
}

const KIND_TO_ZUS_LABEL: Record<string, string> = {
  invoice:    'Rechnung',
  settlement: 'Nebenkostenabrechnung',
  form:       'Formular',
  letter:     'Behördenpost',
  insurance:  'Versicherungsdokument',
  quote:      'Angebot',
  unknown:    'Dokument',
};

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

const _FRIST_MONTH_MAP: Record<string, number> = {
  januar:1, februar:2, märz:3, april:4, mai:5, juni:6,
  juli:7, august:8, september:9, oktober:10, november:11, dezember:12,
  january:1, february:2, march:3, june:6, july:7, october:10, december:12,
  jan:1, feb:2, mär:3, mar:3, apr:4, jun:6, jul:7, aug:8,
  sep:9, okt:10, oct:10, nov:11, dez:12, dec:12,
};

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

  // "24. März 2017" / "März 2017"
  const withDay = raw.trim().match(/^(\d{1,2})\.?\s+(\w+)\s+(\d{4})$/i);
  if (withDay) {
    const mo = _FRIST_MONTH_MAP[withDay[2].toLowerCase()];
    if (mo) {
      const d = new Date(Number(withDay[3]), mo - 1, Number(withDay[1]));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }
  const monthYear = raw.trim().match(/^(\w+)\s+(\d{4})$/i);
  if (monthYear) {
    const mo = _FRIST_MONTH_MAP[monthYear[1].toLowerCase()];
    if (mo) {
      const d = new Date(Number(monthYear[2]), mo - 1, 1);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  return null;
}


function buildRohText(s: OcrMvpJobStatus['action_summary']): string | null {
  if (!s) return null;
  const lines: string[] = [];
  for (const f of s.fields ?? []) {
    const name  = f.name.trim();
    const value = f.value.trim();
    if (name && value) lines.push(`${name}: ${value}`);
  }
  if ((s.tables_count ?? 0) > 0) lines.push(`Tabellen: ${s.tables_count}`);
  if ((s.lines_count  ?? 0) > 0) lines.push(`Zeilen: ${s.lines_count}`);
  if (s.raw_text?.trim()) lines.push(s.raw_text.trim());
  return lines.length > 0 ? lines.join('\n') : null;
}

function buildZusammenfassung(kind: string, s: OcrMvpJobStatus['action_summary']): string | null {
  if (!s) return null;
  // Kullanıcıya karar aldıran bilgiler: gönderen, konu, Aktenzeichen — teknik sayılar değil.
  const parts: string[] = [KIND_TO_ZUS_LABEL[kind] ?? 'Dokument'];
  const sender = s.vendor_name ?? s.sender;
  if (sender?.trim()) parts.push(sender.trim());
  const az = (s.fields ?? []).find(f => /^aktenzeichen$/i.test(f.name.trim()));
  if (az?.value?.trim()) parts.push(`Az. ${az.value.trim()}`);
  return parts.join(' · ');
}

export interface OcrMvpSaveOptions {
  id?:               string;
  uri?:              string | null;
  fileRelativePath?: string | null;
  pages?:            ScannedPage[];
}

export function ocrMvpToV4Document(
  result: OcrMvpJobStatus,
  options?: OcrMvpSaveOptions,
): OcrMvpV4DocumentDraft {
  const s = result.action_summary;
  // "unknown" is not a real classification — fall through to action_summary.kind
  // which is set by the processing pipeline and carries better signal.
  const rawType = result.document_type?.trim();
  const kind    = (rawType && rawType !== 'unknown')
    ? rawType
    : s?.kind?.trim() || 'unknown';

  const dokumentDatum = extractDokumentDatum(s);
  const rohText       = buildRohText(s);

  // Aktenzeichen — direkt alan veya fields[] içinde
  const azField = (s?.fields ?? []).find(f => /^aktenzeichen$/i.test(f.name.trim()));
  const aktenzeichen = azField?.value?.trim() || null;

  const document: Dokument = {
    id:              options?.id ?? generateId(),
    titel:           buildDocumentTitle(kind, s, dokumentDatum),
    typ:             normalizeDocumentTyp(KIND_TO_LEGACY[kind] ?? 'Sonstiges'),
    absender:        buildDocumentSender(kind, s),
    zusammenfassung: s?.summary?.trim() || buildZusammenfassung(kind, s) || null,
    warnung:         s?.warnings?.[0] ?? null,
    betrag:          s?.total_brutto ?? s?.amount ?? null,
    waehrung:        s?.currency ?? '€',
    frist:           parseFrist(s?.deadline ?? s?.due_date),
    risiko:          mapRisiko(s?.risk_level),
    aktionen:        KIND_TO_AKTIONEN[kind] ?? ['ai', 'review'],
    datum:           parseFrist(dokumentDatum) ?? new Date().toISOString(),
    dokumentDatum,
    gelesen:         false,
    erledigt:        false,
    uri:              options?.uri ?? null,
    fileRelativePath: options?.fileRelativePath ?? null,
    pages:            options?.pages,
    rohText,
    aktenzeichen,
    iban:            s?.iban ?? null,
    confidence:      typeof result.confidence === 'number' && result.confidence > 0
                       ? result.confidence <= 1
                         ? Math.round(result.confidence * 100)
                         : Math.round(result.confidence)
                       : null,
    v4JobStatus:     'completed',
  };

  return { document, source: 'ocr_mvp', originalResult: result };
}
