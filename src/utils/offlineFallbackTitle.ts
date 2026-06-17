import type { Dokument } from '@/store/types';

/** How an offline document entered the app (no backend analysis yet). */
export type ImportSource = 'scan' | 'pdf' | 'photo' | 'unknown';

const SOURCE_LABEL: Record<ImportSource, string> = {
  scan: 'Scan',
  pdf: 'PDF',
  photo: 'Foto',
  unknown: 'Dokument',
};

export const OFFLINE_FALLBACK_TITLE_RE =
  /^(\d{4}-\d{2}-\d{2})\s*·\s*(Scan|PDF|Foto|Dokument)\s+(\d{2})$/;

type DocForSequence = Pick<Dokument, 'titel' | 'importSource' | 'datum'>;

export function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function labelToSource(label: string): ImportSource | null {
  const normalized = label.trim().toLowerCase();
  if (normalized === 'scan') return 'scan';
  if (normalized === 'pdf') return 'pdf';
  if (normalized === 'foto') return 'photo';
  if (normalized === 'dokument') return 'unknown';
  return null;
}

export function parseOfflineFallbackTitle(
  titel: string,
): { dayKey: string; source: ImportSource; sequence: number } | null {
  const match = titel.trim().match(OFFLINE_FALLBACK_TITLE_RE);
  if (!match) return null;
  const source = labelToSource(match[2]);
  if (!source) return null;
  return {
    dayKey: match[1],
    source,
    sequence: parseInt(match[3], 10),
  };
}

export function isOfflineFallbackTitle(titel: string | null | undefined): boolean {
  if (!titel?.trim()) return false;
  return OFFLINE_FALLBACK_TITLE_RE.test(titel.trim());
}

export function countOfflineFallbacksForDay(
  existingDocs: DocForSequence[],
  source: ImportSource,
  dayKey: string,
): number {
  let count = 0;
  for (const doc of existingDocs) {
    if (doc.importSource === source) {
      const docDay = formatDayKey(new Date(doc.datum));
      if (docDay === dayKey) count += 1;
      continue;
    }
    const parsed = parseOfflineFallbackTitle(doc.titel ?? '');
    if (parsed && parsed.source === source && parsed.dayKey === dayKey) {
      count += 1;
    }
  }
  return count;
}

export function buildOfflineFallbackTitle(params: {
  source: ImportSource;
  importDate?: Date;
  existingDocs?: DocForSequence[];
}): string {
  const importDate = params.importDate ?? new Date();
  const dayKey = formatDayKey(importDate);
  const label = SOURCE_LABEL[params.source];
  const seq = countOfflineFallbacksForDay(
    params.existingDocs ?? [],
    params.source,
    dayKey,
  ) + 1;
  return `${dayKey} · ${label} ${String(seq).padStart(2, '0')}`;
}

export function resolveOfflineDisplayTitle(dok: {
  titel?: string | null;
  importSource?: ImportSource | null;
  datum?: string | null;
  createdAt?: string | null;
}): string | null {
  const raw = dok.titel?.trim() ?? '';
  if (isOfflineFallbackTitle(raw)) return raw;
  if (!dok.importSource) return null;
  const dateStr = dok.datum ?? dok.createdAt;
  const importDate = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(importDate.getTime())) return null;
  return buildOfflineFallbackTitle({
    source: dok.importSource,
    importDate,
  });
}

export function shareFileTypeToImportSource(
  fileType: 'pdf' | 'image' | 'unknown',
): ImportSource {
  if (fileType === 'pdf') return 'pdf';
  if (fileType === 'image') return 'photo';
  return 'unknown';
}
