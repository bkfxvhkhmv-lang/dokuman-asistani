import { PdfGenerator as CorePdfGenerator } from '../../../core/pdf';
import type { BatchPage, BatchConfig, PdfResult } from '../types';

const core = new CorePdfGenerator();

export class PdfGenerator {
  async generate(pages: BatchPage[], config?: Partial<BatchConfig>): Promise<PdfResult> {
    if (!pages.length) throw new Error('PDF oluşturmak için sayfa yok');

    const profile = config?.pdfQuality === 'low' ? 'draft'
      : config?.pdfQuality === 'medium' ? 'standard'
      : 'high';

    const result = await core.generate(
      pages.map(page => ({
        uri: page.imageSession?.finalUri ?? page.capture?.finalUri ?? page.uri,
        ocrText: page.ocr?.text,
      })),
      { profile }
    );

    return { uri: result.uri, pageCount: result.pageCount, fileSize: result.fileSize };
  }
}
