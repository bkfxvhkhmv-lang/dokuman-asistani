import type { Dokument } from '@/store';
import { formatBetrag } from '@/utils/formatters';
import { normalizeDocumentTyp } from '@/product/canonicalDocTypes';

function slug(s: string, maxLen: number): string {
  const t = (s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLen)
    || 'Dokument';
  return t;
}

function amountPart(dok: Dokument): string {
  if (dok.betrag == null || dok.betrag <= 0) return '';
  const f = formatBetrag(dok.betrag, (dok.waehrung || '€').trim() || '€');
  return f ? f.replace(/[\s,.]/g, c => (c === ' ' ? '_' : '-')) : `${dok.betrag}`;
}

/** z.B. `2026-04-28_AOK_Beitrag_48-50EUR` (ohne .pdf) */
export function buildPdfExportBasename(dok: Dokument): string {
  const dateStr = dok.datum ? new Date(dok.datum).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const typSlug = slug(normalizeDocumentTyp(dok.typ).replace(/\s*\/\s*/g, '_'), 24);
  const sender = slug(dok.absender || dok.titel || 'BriefPilot', 28);
  const amt = amountPart(dok);
  const parts = [dateStr, sender, typSlug];
  const base = parts.filter(Boolean).join('_');
  return amt ? `${base}_${amt}` : base;
}
