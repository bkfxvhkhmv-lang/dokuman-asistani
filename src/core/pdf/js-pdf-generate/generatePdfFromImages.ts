import {
  PDFDocument,
  rgb,
  StandardFonts,
  degrees,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';

import { PAGE_H_PT, PAGE_W_PT } from './constants';
import { embedRaster } from './embedRaster';
import { readUriBytes, writePdfBytes } from './bytes';
import type { PdfLibMetadataSlice, PdfLibPageSource } from './types';

function sanitizeOcr(raw: string): string {
  return raw
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
    .normalize('NFKC')
    .slice(0, 85_000);
}

/** Seçilebilir / aranabilir katman için görünmez metin (opacity 0). */
function embedInvisibleOcrText(page: PDFPage, font: PDFFont, ocrRaw: string): boolean {
  const text = sanitizeOcr(ocrRaw).trim();
  if (!text.length) return false;

  const fontSize = 4.5;
  const margin = 10;
  const maxWidth = PAGE_W_PT - margin * 2;
  const lineHeight = fontSize + 2;

  try {
    page.drawText(text, {
      x: margin,
      y: margin + lineHeight,
      maxWidth,
      size: fontSize,
      font,
      lineHeight,
      wordBreaks: [' ', '\n', '\t', '-'],
      color: rgb(0, 0, 0),
      opacity: 0,
    });
    return true;
  } catch (e) {
    console.warn('[pdf-lib] drawText OCR layer skipped', e);
    return false;
  }
}

export async function generatePdfFromImages(
  pages: PdfLibPageSource[],
  metadata?: PdfLibMetadataSlice,
): Promise<{ uri: string; fileSize: number; isSearchable: boolean } | null> {
  if (!pages.length) return null;

  try {
    const pdf = await PDFDocument.create();

    if (metadata?.title) pdf.setTitle(metadata.title);
    if (metadata?.author) pdf.setAuthor(metadata.author);
    if (metadata?.subject) pdf.setSubject(metadata.subject);
    const kw = metadata?.keywords?.filter(Boolean);
    if (kw?.length) pdf.setKeywords(kw);
    pdf.setProducer('BriefPilot/pdf-lib');

    pdf.setCreationDate(new Date());
    pdf.setModificationDate(new Date());

    const helvetica = await pdf.embedFont(StandardFonts.Helvetica);
    let searchableLayer = false;

    for (const src of pages) {
      const bytes = await readUriBytes(src.uri);
      const embeddedImg = await embedRaster(pdf, bytes);
      const page = pdf.addPage([PAGE_W_PT, PAGE_H_PT]);

      const margin = 18;
      const maxW = PAGE_W_PT - margin * 2;
      const maxH = PAGE_H_PT - margin * 2;
      const dims = embeddedImg.scaleToFit(maxW, maxH);
      const x = margin + (maxW - dims.width) / 2;
      const y = margin + (maxH - dims.height) / 2;

      page.drawImage(embeddedImg, { x, y, width: dims.width, height: dims.height });

      if (src.ocrText?.trim()) {
        if (embedInvisibleOcrText(page, helvetica, src.ocrText)) searchableLayer = true;
      }

      const rot = src.rotation ?? 0;
      if (rot === 90 || rot === 180 || rot === 270) page.setRotation(degrees(rot));
    }

    const outBytes = await pdf.save();
    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
    if (!dir) return null;

    const uri = `${dir}bp_gen_${Date.now()}.pdf`;
    await writePdfBytes(uri, outBytes);

    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    const fileSize =
      typeof (info as any).size === 'number' ? (info as any).size : outBytes.byteLength;

    return {
      uri,
      fileSize,
      isSearchable: searchableLayer,
    };
  } catch (e) {
    console.warn('[pdf-lib] generatePdfFromImages failed', e);
    return null;
  }
}
