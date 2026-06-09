/**
 * Programatik PDF üretimi (pdf-lib).
 * Mantık `./js-pdf-generate/` altında; geriye dönük import yolu.
 */
export type { PdfLibMetadataSlice, PdfLibPageSource } from '@/core/pdf/js-pdf-generate';
export {
  generatePdfFromImages,
  stampRasterOnPdfPage,
  stampSignatureOnLastPage,
  mergePdfUrisIntoFile,
  splitPdfBytesToSinglePagePdfs,
  splitPdfUriIntoPageUris,
} from '@/core/pdf/js-pdf-generate';
