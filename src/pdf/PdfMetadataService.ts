/**
 * Store `Dokument` -> `PdfGenerator` icin kullanilan `PdfMetadata` eslemesi.
 * Ileri asamada pdf-lib ile embedding burada konsolide edilir.
 */
import type { PdfMetadata } from '@/core/pdf/PdfGenerator';
import type { Dokument } from '@/store';

export class PdfMetadataService {
  /** Arsiv/export icin guvenli metin kesimi */
  static clip(s: string, max = 2000): string {
    const t = s.trim();
    return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
  }

  fromDokument(dok: Dokument, overrides?: Partial<PdfMetadata>): PdfMetadata {
    const keywords =
      dok.etiketten?.filter(Boolean) ??
      (dok.aktenzeichen ? [`AZ ${dok.aktenzeichen}`] : []);

    const base: PdfMetadata = {
      title:        dok.titel ?? 'Dokument',
      subject:      [dok.typ, dok.absender].filter(Boolean).join(' · ') || undefined,
      documentType: dok.typ ?? undefined,
      createdAt:    dok.datum ?? undefined,
      keywords,
    };

    if (dok.zusammenfassung?.trim()) {
      const z = PdfMetadataService.clip(dok.zusammenfassung, 180);
      base.subject =
        `${base.subject ?? ''}${base.subject ? ' — ' : ''}${z}`.slice(0, 2000);
    }

    return { ...base, ...overrides };
  }
}

export const pdfMetadataService = new PdfMetadataService();
