/**
 * BriefPilot PDF katmani — tek public entry.
 *
 * - PdfRenderService     : görüntü + OCR ile PDF üretimi
 * - PdfCompressionService: DPI / profil
 * - PdfMetadataService   : Dokument meta eşlemesi
 * - PdfManifestService   : sayfa sırası / senk manifest’i
 * - PdfUploadService     : paylaşım (ileride S3 upload)
 */

export {
  pdfRenderService,
  PdfRenderService,
  type PdfMetadata,
  type PdfOptions,
  type PdfPage,
  type PdfResult,
} from '@/pdf/PdfRenderService';

export { pdfCompressionService, PdfCompressionService } from '@/pdf/PdfCompressionService';
export { pdfMetadataService, PdfMetadataService } from '@/pdf/PdfMetadataService';
export { pdfManifestService, PdfManifestService } from '@/pdf/PdfManifestService';
export { pdfUploadService, PdfUploadService } from '@/pdf/PdfUploadService';

export type { PdfManifest, PdfManifestPageEntry } from '@/pdf/types';
export { PDF_MANIFEST_VERSION } from '@/pdf/types';
export type { CompressionProfile } from '@/pdf/types';
