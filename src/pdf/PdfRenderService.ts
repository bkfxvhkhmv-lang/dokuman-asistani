/**
 * PDF dosyası üretimi — `core/pdf/PdfGenerator` etrafında ince sarici.
 *
 * Yerel motor (`BriefPilotPdfEngine` iOS/Android) veya pdf-lib / expo-print fallback aynı
 * zincirden döner; tüm scanner/batch kodu tek giriş noktasını kullanır.
 */
import { PdfGenerator as CorePdfGenerator } from '@/core/pdf';
import type { PdfMetadata, PdfOptions, PdfPage, PdfResult } from '@/core/pdf/PdfGenerator';

export class PdfRenderService {
  private readonly engine = new CorePdfGenerator();

  async generate(pages: PdfPage[], options: PdfOptions = {}): Promise<PdfResult> {
    return this.engine.generate(pages, options);
  }
}

export const pdfRenderService = new PdfRenderService();

export type { PdfMetadata, PdfOptions, PdfPage, PdfResult };
