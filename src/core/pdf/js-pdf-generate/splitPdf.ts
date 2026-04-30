import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';

import { base64ToUint8, writePdfBytes } from './bytes';
import type { PdfLibMetadataSlice } from './types';

/**
 * PDF’i bellekte tek sayfalık PDF baytlarına böler (S3 — split motoru).
 * UI / dosya yazımı için `splitPdfUriIntoPageUris` kullanılabilir.
 */
export async function splitPdfBytesToSinglePagePdfs(pdfBytes: Uint8Array): Promise<Uint8Array[] | null> {
  if (!pdfBytes?.length) return null;
  try {
    const src = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const out: Uint8Array[] = [];
    for (let i = 0; i < src.getPageCount(); i++) {
      const one = await PDFDocument.create();
      const [copied] = await one.copyPages(src, [i]);
      one.addPage(copied);
      out.push(await one.save());
    }
    return out;
  } catch (e) {
    console.warn('[pdf-lib] splitPdfBytesToSinglePagePdfs failed', e);
    return null;
  }
}

/** Her sayfa için geçici `file://` URI üretir (cache veya document dizini). */
export async function splitPdfUriIntoPageUris(
  pdfUri: string,
  metadata?: PdfLibMetadataSlice,
): Promise<{ uris: string[]; fileSizes: number[] } | null> {
  const b64 = await FileSystem.readAsStringAsync(pdfUri, { encoding: FileSystem.EncodingType.Base64 });
  const pdfBytes = base64ToUint8(b64);
  const pages = await splitPdfBytesToSinglePagePdfs(pdfBytes);
  if (!pages?.length) return null;

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
  if (!dir) return null;

  const uris: string[] = [];
  const fileSizes: number[] = [];

  for (let i = 0; i < pages.length; i++) {
    const doc = await PDFDocument.load(pages[i], { ignoreEncryption: true });
    if (metadata?.title) doc.setTitle(`${metadata.title} (S. ${i + 1})`);
    if (metadata?.author) doc.setAuthor(metadata.author);
    doc.setProducer('BriefPilot/pdf-lib-split');
    doc.setModificationDate(new Date());
    const bytes = await doc.save();
    const uri = `${dir}bp_split_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}.pdf`;
    await writePdfBytes(uri, bytes);
    uris.push(uri);
    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    fileSizes.push(
      typeof (info as any).size === 'number' ? (info as any).size : bytes.byteLength,
    );
  }

  return { uris, fileSizes };
}
