import type { Dokument } from '@/store';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

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
  const lang = getLangSync();
  if (dok.isOptimistic) {
    return { phase: 'processing', label: t(lang, 'pipeline.label.analyzing') };
  }
  if (dok.v4JobStatus === 'failed') {
    return { phase: 'error', label: t(lang, 'common.error') };
  }
  if (dok.v4JobStatus === 'pending' || dok.v4JobStatus === 'processing') {
    return {
      phase: 'processing',
      label: dok.v4JobStatus === 'pending' ? t(lang, 'pipeline.label.pending') : t(lang, 'pipeline.label.processing'),
    };
  }

  const hasSummary = !!(dok.zusammenfassung && dok.zusammenfassung.trim().length > 0);
  const textLen = dok.rohText?.trim().length ?? 0;
  const hasText = textLen >= 40;
  const hasScanHint = !!(dok.pages?.length || dok.uri);

  if (hasSummary || hasText) {
    return { phase: 'completed', label: t(lang, 'pipeline.label.ready') };
  }

  if (hasScanHint && !dok.erledigt) {
    return { phase: 'processing', label: t(lang, 'pipeline.label.analyzing') };
  }

  if (!hasScanHint && !dok.erledigt) {
    return { phase: 'pending', label: t(lang, 'home.filter.open') };
  }

  return { phase: 'completed', label: t(lang, 'pipeline.label.ready') };
}
