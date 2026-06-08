import * as FileSystem from 'expo-file-system/legacy';
import { generateId } from '@/utils/formatters';
import { persistScanFiles } from '@/modules/scanner/storage/scanFileStorage';
import type { Dokument, ScannedPage } from '@/store';

function getFileSize(info: FileSystem.FileInfo): number | undefined {
  if (info.exists && typeof (info as { size?: unknown }).size === 'number') {
    return (info as { size: number }).size;
  }
  return undefined;
}

export function buildDraftTitle(fileName: string | null | undefined, uri: string | null | undefined): string {
  const raw = (fileName ?? uri?.split('/').pop() ?? 'Dokument')
    .replace(/\.(pdf|jpe?g|png|heic|webp)$/i, '');
  return raw.trim() || 'Dokument';
}

export function buildDraftDocument(
  docId: string,
  persistedPages: ScannedPage[],
  fileName: string | null | undefined,
  uri: string | null | undefined,
): Dokument {
  const rawTitle = buildDraftTitle(fileName, uri);
  return {
    id:              docId,
    titel:           rawTitle,
    typ:             'Sonstiges',
    absender:        'Unbekannt',
    zusammenfassung: null,
    warnung:         null,
    betrag:          null,
    waehrung:        '€',
    frist:           null,
    risiko:          'niedrig',
    aktionen:        [],
    datum:           new Date().toISOString(),
    gelesen:         false,
    erledigt:        false,
    uri:             persistedPages[0]?.uri ?? null,
    fileRelativePath:persistedPages[0]?.relativePath ?? null,
    pages:           persistedPages,
    rohText:         null,
    confidence:      null,
  };
}

/** Same page count + first-page byte size → treat as duplicate import. */
export async function findDuplicateImportByFileSize(
  docs: Dokument[],
  pages: ScannedPage[],
): Promise<Dokument | null> {
  if (pages.length === 0) return null;
  const first = pages[0];
  if (!first?.uri) return null;

  const srcInfo = await FileSystem.getInfoAsync(first.uri);
  const srcSize = getFileSize(srcInfo);
  if (srcSize == null) return null;

  for (const d of docs) {
    if (!d.pages?.length || d.pages.length !== pages.length) continue;
    const candidateUri = d.pages[0]?.uri;
    if (!candidateUri) continue;
    try {
      const dupInfo = await FileSystem.getInfoAsync(candidateUri);
      if (getFileSize(dupInfo) === srcSize) return d;
    } catch {
      // skip unreadable legacy paths
    }
  }
  return null;
}

export async function persistImportSource(
  existingDocId: string | null,
  sourceUri: string,
): Promise<{ docId: string; pages: ScannedPage[] }> {
  const docId = existingDocId ?? generateId();
  const pages = await persistScanFiles(docId, [sourceUri]);
  if (!pages.length) {
    throw new Error('Import konnte nicht gespeichert werden.');
  }
  return { docId, pages };
}
