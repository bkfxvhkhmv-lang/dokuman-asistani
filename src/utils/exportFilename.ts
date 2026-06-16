import type { Dokument } from '@/store';
import { normalizeDocumentTyp } from '@/product/canonicalDocTypes';
import { safeDisplayAbsender, safeDisplayTitel } from '@/utils/displaySanitizer';

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

function normalizeType(typ?: string | null): string {
  const normalized = normalizeDocumentTyp(typ).replace(/\s*\/\s*/g, ' ');
  if (normalized === 'Rechnungen') return 'Rechnung';
  if (normalized === 'Verträge') return 'Vertrag';
  return normalized === 'Sonstiges' ? 'Dokument' : normalized;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMonthYear(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDayMonthYear(date: Date): string {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getFullYear()),
  ].join('-');
}

function formatExportDate(date: Date | null, preferDayPrecision: boolean): string {
  if (!date) return formatDayMonthYear(new Date());
  return preferDayPrecision ? formatDayMonthYear(date) : formatMonthYear(date);
}

export interface HumanExportNameInput {
  sender?: string | null;
  title?: string | null;
  type?: string | null;
  date?: string | null;
  dueDate?: string | null;
  preferDayPrecision?: boolean;
}

export function buildHumanExportBasename(input: HumanExportNameInput): string {
  const sender = safeDisplayAbsender(input.sender);
  const title = safeDisplayTitel(input.title, input.type);
  const type = normalizeType(input.type);
  const senderSlug = slug(sender, 32);
  const titleSlug = slug(title, 40);
  const typeSlug = slug(type, 28);
  const baseLabel = sender ? senderSlug : titleSlug;
  const effectiveSenderOrTitle = baseLabel === 'Unbekanntes_Dokument' ? 'Dokument' : baseLabel;
  const weakMetadata = !sender && (!input.title || effectiveSenderOrTitle === 'Dokument');
  const baseAlreadyContainsType =
    !!typeSlug &&
    (effectiveSenderOrTitle === typeSlug || effectiveSenderOrTitle.endsWith(`_${typeSlug}`));

  const date = parseDate(input.date);
  const dueDate = parseDate(input.dueDate);
  const preferDayPrecision =
    input.preferDayPrecision ?? (weakMetadata || !!dueDate || /behoerd|amt|versicherung|mahnung|bescheid/i.test(type));
  const datePart = formatExportDate(dueDate ?? date, preferDayPrecision);

  const parts = [effectiveSenderOrTitle];
  if (typeSlug && typeSlug !== 'Dokument' && !baseAlreadyContainsType) parts.push(typeSlug);
  parts.push(datePart);

  return parts.filter(Boolean).join('_');
}

export function buildPdfExportBasename(dok: Dokument): string {
  return buildHumanExportBasename({
    sender: dok.absender,
    title: dok.titel,
    type: dok.typ,
    date: dok.datum,
    dueDate: dok.frist,
  });
}

export function buildMultiDocExportBasename(count: number, date?: Date): string {
  const n = Math.max(1, Math.floor(count));
  const d = (date ?? new Date()).toISOString().slice(0, 10);
  return `BriefPilot_${n}_Dokumente_${d}`;
}

const SHARE_FALLBACK_BASENAME = 'Dokument';

/** Extension from stored page URI (query string stripped). */
export function inferShareFileExtension(sourceUri: string): string {
  const path = (sourceUri || '').split('?')[0].toLowerCase();
  if (path.endsWith('.pdf')) return '.pdf';
  if (path.endsWith('.jpeg')) return '.jpeg';
  if (path.endsWith('.jpg')) return '.jpg';
  if (path.endsWith('.png')) return '.png';
  if (path.endsWith('.webp')) return '.webp';
  return '.pdf';
}

export interface PageShareFilenameInput {
  dok?: Pick<Dokument, 'absender' | 'titel' | 'typ' | 'datum' | 'frist'> | null;
  pageIndex: number;
  pageCount: number;
  sourceUri: string;
}

/** Human-readable share filename for a document page (preserves source extension). */
export function buildPageShareFilename(input: PageShareFilenameInput): string {
  const ext = inferShareFileExtension(input.sourceUri);
  const base = input.dok
    ? buildPdfExportBasename(input.dok as Dokument)
    : SHARE_FALLBACK_BASENAME;
  const stem =
    input.pageCount > 1
      ? `${base}_Seite_${input.pageIndex + 1}`
      : base;
  return `${stem}${ext}`;
}
