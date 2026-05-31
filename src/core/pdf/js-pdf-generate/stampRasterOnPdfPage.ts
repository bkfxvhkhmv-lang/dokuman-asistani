import { PDFDocument, degrees } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';

import { embedRaster } from './embedRaster';
import { readUriBytes, writePdfBytes } from './bytes';

/**
 * Var olan PDF’in bir sayfasına raster damga (çizilmiş imza PNG’si vb.).
 * Koordinatlar pdf-lib düzeninde: sol-alt köşe orijin, pt.
 */
export async function stampRasterOnPdfPage(
  pdfUri: string,
  imageUri: string,
  box: { pageIndex?: number; x: number; y: number; width: number; height: number; rotateDeg?: number },
): Promise<{ uri: string; fileSize: number } | null> {
  try {
    const rawPdf = await readUriBytes(pdfUri);
    const doc = await PDFDocument.load(rawPdf, { ignoreEncryption: true });
    const rawImg = await readUriBytes(imageUri);
    const embedded = await embedRaster(doc, rawImg);

    const pages = doc.getPages();
    if (!pages.length) return null;
    const idx =
      box.pageIndex != null
        ? Math.min(Math.max(box.pageIndex, 0), pages.length - 1)
        : pages.length - 1;
    const page = pages[idx];

    page.drawImage(embedded, {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      ...(box.rotateDeg ? { rotate: degrees(box.rotateDeg) } : {}),
    });

    const outBytes = await doc.save();
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
    if (!dir) return null;

    const uri = `${dir}bp_stamp_${Date.now()}.pdf`;
    await writePdfBytes(uri, outBytes);

    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    const fileSize =
      typeof (info as any).size === 'number' ? (info as any).size : outBytes.byteLength;

    return { uri, fileSize };
  } catch (e) {
    console.warn('[pdf-lib] stampRasterOnPdfPage failed', e);
    return null;
  }
}
