/**
 * Ortak PDF domain tipleri (manifest + servis arayi).
 */

import type { CompressionProfile } from '@/core/pdf/compressionProfiles';

export const PDF_MANIFEST_VERSION = 1 as const;

/** Sayfa dizisi sirasi ve kalici kimlik — senkron / yeniden-duzen icin. */
export interface PdfManifestPageEntry {
  id: string;
  order: number;
  /** documentDirectory icindeki yerel URI (tam veya govde alt yolu). */
  uri?: string;
}

/**
 * Yerel birlesik PDF denetim kaydi — cloud upload oncesi veya yeniden-render.
 * Sade JSON; binary PDF dahil degil (ayri dosya).
 */
export interface PdfManifest {
  version:       typeof PDF_MANIFEST_VERSION;
  dokumentId:    string;
  titel?:        string;
  /** ISO tarih PDF veya paket olusturulma zamani */
  compiledAt:    string;
  /** Son kullanilan sıkıştırma profili (yeniden üretilebilirlik) */
  profile?:      CompressionProfile;
  /** Backend referansi */
  pdfUri?:       string;
  pdfFileName?: string;
  pages:      PdfManifestPageEntry[];
}

export type { CompressionProfile };
