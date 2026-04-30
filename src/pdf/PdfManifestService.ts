/**
 * Yerel paket/manifest JSON — sirali sayfa listesi ve yeniden-render icin
 * tek kaynak. Binary PDF dahil degil; `pdfUri` sonra doldurulabilir.
 */
import type { CompressionProfile } from '@/core/pdf/compressionProfiles';
import type { Dokument, ScannedPage } from '@/store';
import type { PdfManifest } from '@/pdf/types';
import { PDF_MANIFEST_VERSION } from '@/pdf/types';

export class PdfManifestService {
  buildFromDocument(
    dokument: Dokument,
    overrides?: Partial<Pick<PdfManifest, 'profile' | 'pdfUri' | 'pdfFileName'>>,
    pagesOverride?: ScannedPage[],
  ): PdfManifest {
    const pages = pagesOverride ?? dokument.pages ?? [];

    const sorted = [...pages].sort((a, b) => a.order - b.order);

    return {
      version:      PDF_MANIFEST_VERSION,
      dokumentId:   dokument.id,
      titel:        dokument.titel,
      compiledAt:   new Date().toISOString(),
      profile:      overrides?.profile,
      pdfUri:       overrides?.pdfUri,
      pdfFileName:  overrides?.pdfFileName,
      pages: sorted.map(p => ({
        id: p.id,
        order: p.order,
        uri: p.uri ?? undefined,
      })),
    };
  }

  serialize(manifest: PdfManifest): string {
    return JSON.stringify(manifest, null, 0);
  }

  parse(json: string): PdfManifest | null {
    try {
      const raw = JSON.parse(json) as unknown;
      if (!raw || typeof raw !== 'object') return null;
      const v = raw as Partial<PdfManifest>;
      if (v.version !== PDF_MANIFEST_VERSION) return null;
      if (typeof v.dokumentId !== 'string' || !v.compiledAt) return null;
      if (!Array.isArray(v.pages)) return null;
      for (const p of v.pages) {
        const e = p as Partial<PdfManifest['pages'][0]>;
        if (!e || typeof e.id !== 'string' || typeof e.order !== 'number') return null;
      }
      return raw as PdfManifest;
    } catch {
      return null;
    }
  }

  mergeProfile(manifest: PdfManifest, profile: CompressionProfile): PdfManifest {
    return { ...manifest, profile };
  }
}

export const pdfManifestService = new PdfManifestService();
