export { PdfGenerator } from '@/core/pdf/PdfGenerator';
export { getProfile, COMPRESSION_PROFILES } from '@/core/pdf/compressionProfiles';
export { normalizeForDpi, estimateDpi } from '@/core/pdf/dpiNormalizer';
export {
  generatePdfFromImages,
  mergePdfUrisIntoFile,
  splitPdfBytesToSinglePagePdfs,
  splitPdfUriIntoPageUris,
  stampRasterOnPdfPage,
  stampSignatureOnLastPage,
} from '@/core/pdf/jsPdfGenerate';
export type { PdfLibMetadataSlice, PdfLibPageSource } from '@/core/pdf/jsPdfGenerate';
export type { AcroFormInspectResult } from '@/core/pdf/acroFormInspect';
export { inspectAcroFormPdfBytes } from '@/core/pdf/acroFormInspect';

export type { FillPdfTextFieldsResult } from '@/core/pdf/fillPdfForm';
export { fillPdfTextFields } from '@/core/pdf/fillPdfForm';
export type { CompressionProfile, ProfileSpec } from '@/core/pdf/compressionProfiles';
export type { PdfPage, PdfMetadata, PdfOptions, PdfResult } from '@/core/pdf/PdfGenerator';
