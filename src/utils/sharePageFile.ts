import * as FileSystem from 'expo-file-system/legacy';
import type { Dokument } from '@/store';
import { buildPageShareFilename } from '@/utils/exportFilename';

/** Copy source to cache under a human-readable name for share sheets. */
export async function preparePageShareUri(params: {
  sourceUri: string;
  dok?: Pick<Dokument, 'absender' | 'titel' | 'typ' | 'datum' | 'frist'> | null;
  pageIndex: number;
  pageCount: number;
}): Promise<{ uri: string; filename: string; mimeType: string }> {
  const filename = buildPageShareFilename({
    dok: params.dok,
    pageIndex: params.pageIndex,
    pageCount: params.pageCount,
    sourceUri: params.sourceUri,
  });
  const safeName = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const dest = `${FileSystem.cacheDirectory}briefpilot_share_${Date.now()}_${safeName}`;
  await FileSystem.copyAsync({ from: params.sourceUri, to: dest });
  const ext = safeName.slice(safeName.lastIndexOf('.')).toLowerCase();
  const mimeType =
    ext === '.pdf' ? 'application/pdf'
    : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : 'application/octet-stream';
  return { uri: dest, filename: safeName, mimeType };
}
