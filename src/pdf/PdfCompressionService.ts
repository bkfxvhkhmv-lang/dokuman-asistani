/**
 * Sıkıştırma profili seçimi ve DPI uyumlu görsel normalizasyonu.
 *
 * Mevcut uygulama `core/pdf` içindeki `getProfile` + `normalizeForDpi`
 * üzerinden çalışır; burada tek facade kalır ki S3/backend tarafından
 * aynı API çağrılabilsin.
 */
import type { CompressionProfile } from '@/core/pdf/compressionProfiles';
import {
  COMPRESSION_PROFILES,
  getProfile,
  type ProfileSpec,
} from '@/core/pdf/compressionProfiles';
import { estimateDpi, normalizeForDpi, type NormalizeResult } from '@/core/pdf/dpiNormalizer';

export class PdfCompressionService {
  profiles = COMPRESSION_PROFILES;

  /** Profil özeti (JPEG kalitesi, hedef px, DPI). */
  resolveProfile(profile: CompressionProfile): ProfileSpec {
    return getProfile(profile);
  }

  /** Tek sayfayi profil kutusuna sigdir (EXIF strip dahil — core ile ayni). */
  async normalizePage(
    uri: string,
    originalWidth: number,
    originalHeight: number,
    profile: CompressionProfile,
  ): Promise<NormalizeResult> {
    const spec = getProfile(profile);
    return normalizeForDpi(uri, originalWidth, originalHeight, spec);
  }

  /** Piksellerden yaklasik DPI (A4 portre varsayimi — core ile ayni). */
  estimateEffectiveDpi(width: number, height: number): number {
    return estimateDpi(width, height);
  }
}

export const pdfCompressionService = new PdfCompressionService();
