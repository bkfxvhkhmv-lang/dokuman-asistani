import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';

import { embedRaster } from './embedRaster';
import { readUriBytes, writePdfBytes } from './bytes';

/**
 * Son sayfanın sağ-alt köşesine imza PNG’sini yerleştirir (A4 uyumlu).
 */
export async function stampSignatureOnLastPage(
  pdfUri: string,
  signaturePngUri: string,
  opts?: { marginPt?: number; maxWidthPt?: number },
): Promise<{ uri: string; fileSize: number } | null> {
  try {
    const rawPdf = await readUriBytes(pdfUri);
    const doc = await PDFDocument.load(rawPdf, { ignoreEncryption: true });
    const pdfPages = doc.getPages();
    if (!pdfPages.length) return null;

    const page = pdfPages[pdfPages.length - 1];
    const { width: pw } = page.getSize();
    const margin = opts?.marginPt ?? 32;
    const maxW = opts?.maxWidthPt ?? 140;

    const imgBytes = await readUriBytes(signaturePngUri);
    const embedded = await embedRaster(doc, imgBytes);
    const nw = embedded.width;
    const nh = embedded.height;
    const w = Math.min(maxW, Math.max(24, pw - margin * 2));
    const h = Math.max((nh / nw) * w, 8);

    const x = pw - margin - w;
    const y = margin;

    page.drawImage(embedded, { x, y, width: w, height: h });

    const outBytes = await doc.save();
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
    if (!dir) return null;

    const uri = `${dir}bp_sign_${Date.now()}.pdf`;
    await writePdfBytes(uri, outBytes);

    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    const fileSize =
      typeof (info as any).size === 'number' ? (info as any).size : outBytes.byteLength;

    return { uri, fileSize };
  } catch (e) {
    console.warn('[pdf-lib] stampSignatureOnLastPage failed', e);
    return null;
  }
}
