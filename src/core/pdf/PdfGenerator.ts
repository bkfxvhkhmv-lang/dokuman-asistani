import * as FileSystem from 'expo-file-system/legacy';
import { printToFileAsync } from 'expo-print';
import type { CompressionProfile } from './compressionProfiles';
import { getProfile } from './compressionProfiles';
import { normalizeForDpi } from './dpiNormalizer';
import { nativeGeneratePdf } from './native/PdfEngine.stub';

export interface PdfPage {
  uri: string;
  width?: number;
  height?: number;
  ocrText?: string;       // text to embed as searchable overlay
}

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  documentType?: string;
  createdAt?: string;
  keywords?: string[];
}

export interface PdfOptions {
  profile?: CompressionProfile;
  metadata?: PdfMetadata;
  onProgress?: (step: number, total: number, label: string) => void;
}

export interface PdfResult {
  uri: string;
  pageCount: number;
  fileSize: number;
  profile: CompressionProfile;
  isSearchable: boolean;
  dpi: number;
}

export class PdfGenerator {
  /**
   * Generate a professional PDF from scanned pages.
   * Pipeline: normalize DPI → encode as base64 → build HTML with OCR layer → print to PDF.
   * Native engine wires in via PdfEngine.stub.ts for PDF/A and true text objects.
   */
  async generate(pages: PdfPage[], options: PdfOptions = {}): Promise<PdfResult> {
    if (!pages.length) throw new Error('Keine Seiten zum Generieren');

    const profile = options.profile ?? 'high';
    const spec = getProfile(profile);
    const { onProgress, metadata } = options;
    const total = pages.length + 2; // normalize + build + print
    let step = 0;

    onProgress?.(step++, total, 'Bilder werden normalisiert…');

    // Step 1: DPI normalization for each page
    const normalizedPages = await Promise.all(pages.map(async (page) => {
      const normalized = await normalizeForDpi(
        page.uri,
        page.width ?? 2000,
        page.height ?? 2000,
        spec,
      );
      return { ...page, uri: normalized.uri, width: normalized.width, height: normalized.height };
    }));

    onProgress?.(step++, total, 'PDF wird aufgebaut…');

    // Try native path first
    const nativeResult = await nativeGeneratePdf(
      normalizedPages.map(p => ({ imageUri: p.uri, ocrText: p.ocrText, width: p.width ?? spec.targetWidthPx, height: p.height ?? spec.targetHeightPx })),
      { title: metadata?.title, author: metadata?.author, subject: metadata?.subject, keywords: metadata?.keywords, dpi: spec.dpi, quality: spec.jpegQuality },
    );

    if (nativeResult) {
      onProgress?.(total, total, 'Fertig');
      return { uri: nativeResult.uri, pageCount: pages.length, fileSize: nativeResult.fileSize, profile, isSearchable: nativeResult.isSearchable, dpi: spec.dpi };
    }

    // JS fallback: HTML → PDF via expo-print
    const html = await this.buildHtml(normalizedPages, metadata, spec.dpi);
    onProgress?.(step++, total, 'PDF wird gerendert…');

    const printed = await printToFileAsync({ html, base64: false });
    const info = await FileSystem.getInfoAsync(printed.uri, { size: true } as any);
    const fileSize = (info as any).size ?? 0;

    onProgress?.(total, total, 'Fertig');

    return {
      uri: printed.uri,
      pageCount: pages.length,
      fileSize,
      profile,
      isSearchable: normalizedPages.some(p => !!p.ocrText),
      dpi: spec.dpi,
    };
  }

  private async buildHtml(pages: PdfPage[], metadata: PdfMetadata | undefined, dpi: number): Promise<string> {
    const renderedPages = await Promise.all(
      pages.map(async (page, index) => {
        const dataUri = await this.toDataUri(page.uri);
        const isLast = index === pages.length - 1;
        const ocrOverlay = page.ocrText ? this.buildOcrOverlay(page.ocrText) : '';
        return `
<section class="pdf-page${isLast ? '' : ' page-break'}">
  <div class="page-inner">
    <img src="${dataUri}" alt="Seite ${index + 1}" class="page-img" />
    ${ocrOverlay}
  </div>
</section>`;
      })
    );

    const metaTags = metadata ? `
    <meta name="title" content="${this.esc(metadata.title ?? '')}">
    <meta name="author" content="${this.esc(metadata.author ?? '')}">
    <meta name="subject" content="${this.esc(metadata.subject ?? '')}">
    <meta name="keywords" content="${this.esc((metadata.keywords ?? []).join(', '))}">
    <meta name="document-type" content="${this.esc(metadata.documentType ?? '')}">
    <meta name="created" content="${metadata.createdAt ?? new Date().toISOString()}">` : '';

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="BriefPilot v6">
  <meta name="dpi" content="${dpi}">
  ${metaTags}
  <style>
    @page { size: A4 portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .pdf-page {
      width: 210mm; min-height: 297mm;
      display: flex; align-items: flex-start; justify-content: center;
      background: #fff; page-break-inside: avoid;
    }
    .page-break { page-break-after: always; }
    .page-inner { position: relative; width: 100%; }
    .page-img {
      display: block; width: 100%; height: auto;
      object-fit: contain; image-rendering: high-quality;
    }
    /* OCR text layer: invisible but selectable/searchable */
    .ocr-layer {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      color: transparent; font-size: 8px; line-height: 1.4;
      white-space: pre-wrap; word-break: break-word;
      user-select: text; pointer-events: none;
      padding: 8px;
    }
  </style>
</head>
<body>
${renderedPages.join('\n')}
</body>
</html>`;
  }

  private buildOcrOverlay(text: string): string {
    return `<div class="ocr-layer" aria-label="Erkannter Text">${this.esc(text)}</div>`;
  }

  private async toDataUri(uri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:${this.getMimeType(uri)};base64,${base64}`;
  }

  private getMimeType(uri: string): string {
    const ext = uri.toLowerCase().split('.').pop();
    if (ext === 'png')  return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
