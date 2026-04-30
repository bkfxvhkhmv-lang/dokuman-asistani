import { PDFDocument } from 'pdf-lib';

export async function embedRaster(pdf: PDFDocument, bytes: Uint8Array) {
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50;

  if (isJpeg) return pdf.embedJpg(bytes);
  if (isPng) return pdf.embedPng(bytes);
  try {
    return await pdf.embedJpg(bytes);
  } catch {
    return pdf.embedPng(bytes);
  }
}
