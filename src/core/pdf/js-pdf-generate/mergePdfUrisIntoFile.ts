import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';

import { readUriBytes, writePdfBytes } from './bytes';
import type { PdfLibMetadataSlice } from './types';

export async function mergePdfUrisIntoFile(
  pdfUris: readonly string[],
  metadata?: PdfLibMetadataSlice,
): Promise<{ uri: string; fileSize: number } | null> {
  if (!pdfUris.length) return null;

  try {
    const merged = await PDFDocument.create();
    if (metadata?.title) merged.setTitle(metadata.title);
    if (metadata?.author) merged.setAuthor(metadata.author);
    if (metadata?.subject) merged.setSubject(metadata.subject);
    const kw = metadata?.keywords?.filter(Boolean);
    if (kw?.length) merged.setKeywords(kw);

    merged.setProducer('BriefPilot/pdf-lib-merge');
    merged.setCreationDate(new Date());
    merged.setModificationDate(new Date());

    for (const u of pdfUris) {
      const bytes = await readUriBytes(u);
      const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await merged.copyPages(srcDoc, srcDoc.getPageIndices());
      copied.forEach(p => merged.addPage(p));
    }

    const outBytes = await merged.save();
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
    if (!dir) return null;

    const uri = `${dir}bp_merge_${Date.now()}.pdf`;
    await writePdfBytes(uri, outBytes);

    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    const fileSize =
      typeof (info as any).size === 'number' ? (info as any).size : outBytes.byteLength;

    return { uri, fileSize };
  } catch (e) {
    console.warn('[pdf-lib] mergePdfUrisIntoFile failed', e);
    return null;
  }
}
