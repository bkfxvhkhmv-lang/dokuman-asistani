import type { Dokument } from '@/store';

/** Ürün söylediği 4 yüzey — backend `v4JobStatus` ile hizalı isimler */
export type PipelineUiPhase = 'pending' | 'processing' | 'completed' | 'error';

export interface DocumentPipelineInfo {
  phase: PipelineUiPhase;
  /** Liste / rozet için kısa metin */
  label: string;
}

type DokMitOpt = Dokument & { isOptimistic?: boolean };

/**
 * Yerel optimistik kart, sunucu job’u ve metin özeti OCR birleştirilir.
 */
export function getDocumentPipelineInfo(dok: DokMitOpt): DocumentPipelineInfo {
  if (dok.isOptimistic) {
    return { phase: 'processing', label: 'Analyse…' };
  }
  if (dok.v4JobStatus === 'failed') {
    return { phase: 'error', label: 'Fehler' };
  }
  if (dok.v4JobStatus === 'pending' || dok.v4JobStatus === 'processing') {
    return {
      phase: 'processing',
      label: dok.v4JobStatus === 'pending' ? 'Wartet…' : 'Verarbeitung…',
    };
  }

  const hasSummary = !!(dok.zusammenfassung && dok.zusammenfassung.trim().length > 0);
  const textLen = dok.rohText?.trim().length ?? 0;
  const hasText = textLen >= 40;
  const hasScanHint = !!(dok.pages?.length || dok.uri);

  if (hasSummary || hasText) {
    return { phase: 'completed', label: 'Bereit' };
  }

  if (hasScanHint && !dok.erledigt) {
    return { phase: 'processing', label: 'Analyse…' };
  }

  if (!hasScanHint && !dok.erledigt) {
    return { phase: 'pending', label: 'Offen' };
  }

  return { phase: 'completed', label: 'Bereit' };
}
