import { useCallback } from 'react';
import { optimizeDocumentImage } from '@/modules/image-processing/engine/SkiaDocumentOptimizer';
import { ERROR_COPY } from '@/features/detail/constants/documentStatus';

interface OcrInput {
  originalUri: string;
  finalUri: string;
  qualityMetrics?: { overallScore: number };
}

interface BatchPage {
  id: string;
  order: number;
  imageSession: {
    originalUri: string;
    finalUri: string;
    quality?: { overallScore: number };
  };
}

interface Deps {
  pages: BatchPage[];
  recognizeCaptures: (inputs: OcrInput[]) => Promise<any>;
  attachOcr: (id: string, data: any) => void;
  finalizeDocument: (data: any) => Promise<any>;
  /** V12: if provided, replaces finalizeDocument — opens review modal instead of saving directly */
  analyzeAndReview?: (data: { rawText: string; confidence: number | null; pages: Array<{ uri: string }> }) => Promise<void>;
  attachMetadata: (id: string, data: any) => void;
  clearPages: () => void;
  setMode: (mode: 'camera' | 'batch' | 'processing') => void;
  showSheet: (cfg: any) => void;
  hideSheet: () => void;
  onComplete: (savedId?: string) => void;
  dispatchOptimistic?: (pages: Array<{ uri: string }>) => string;
  onOptimisticFail?: (id: string) => void;
  /** Called when OCR yields no usable result — saves a minimal needs_review document. */
  onNeedsReview?: (pageUris: Array<{ uri: string }>) => void;
}

export function useProcessingHandler({
  pages, recognizeCaptures, attachOcr, finalizeDocument, analyzeAndReview,
  attachMetadata, clearPages, setMode, showSheet, hideSheet, onComplete,
  dispatchOptimistic, onOptimisticFail, onNeedsReview,
}: Deps) {
  const handleProcessAll = useCallback(async () => {
    if (pages.length === 0) return;
    setMode('processing');

    const orderedPages = [...pages].sort((a, b) => a.order - b.order);
    const rawPageUris  = orderedPages.map(p => ({ uri: p.imageSession.finalUri }));
    const optimisticId = dispatchOptimistic?.(rawPageUris);

    try {
      const optimizedUris = await Promise.all(
        orderedPages.map(page => optimizeDocumentImage(page.imageSession.finalUri))
      );

      const pageUris: Array<{ uri: string }> = optimizedUris.map(uri => ({ uri }));

      const ocrInputs: OcrInput[] = orderedPages.map((page, i) => ({
        originalUri: page.imageSession.originalUri,
        finalUri:    optimizedUris[i],
        qualityMetrics: page.imageSession.quality
          ? { overallScore: page.imageSession.quality.overallScore }
          : undefined,
      }));

      const ocrResult = await recognizeCaptures(ocrInputs);
      const rawText   = ocrResult?.text?.trim() ?? '';

      // OCR yielded no usable content — route to needs_review instead of crashing
      if (!ocrResult || rawText.length < 10) {
        if (optimisticId) onOptimisticFail?.(optimisticId);
        if (onNeedsReview) {
          onNeedsReview(pageUris);
          return;
        }
        showSheet({
          title:   'Analyse nicht vollständig',
          message: ERROR_COPY.ocr_failed,
          icon:    'document-text',
          tone:    'warning',
          actions: [
            { label: 'Erneut versuchen', variant: 'primary',   onPress: () => { hideSheet(); handleProcessAll(); } },
            { label: 'Neu scannen',      variant: 'secondary', onPress: () => { hideSheet(); clearPages(); setMode('camera'); } },
          ],
        });
        return;
      }

      orderedPages.forEach((page, index) => {
        attachOcr(page.id, {
          text:       ocrResult.pages[index]?.text || '',
          confidence: ocrResult.pages[index]?.confidence || 0,
          blocks:     [],
        });
      });

      if (analyzeAndReview) {
        // V12 smart pipeline: OCR done → open AutoFillReviewModal
        // Modal's onBestaetigen will call confirmAndSave → clearPages → navigate
        if (optimisticId) onOptimisticFail?.(optimisticId);
        hideSheet();
        setMode('camera');
        await analyzeAndReview({ rawText, confidence: ocrResult.confidence ?? null, pages: pageUris });
        return;
      }

      const savedDocument = await finalizeDocument({
        rawText,
        confidence:  ocrResult.confidence ?? null,
        pages:       pageUris,
        optimisticId,
      });

      orderedPages.forEach(page => {
        attachMetadata(page.id, {
          documentId:   savedDocument.id,
          documentType: savedDocument.typ,
          risk:         savedDocument.risiko,
        });
      });

      hideSheet();
      clearPages();
      setMode('camera');
      onComplete(savedDocument.id);
    } catch (e) {
      if (optimisticId) onOptimisticFail?.(optimisticId);
      showSheet({
        title:   'Bitte kurz prüfen',
        message: ERROR_COPY.ocr_failed,
        icon:    'document-text',
        tone:    'warning',
        actions: [
          { label: 'Erneut versuchen', variant: 'primary',   onPress: () => { hideSheet(); handleProcessAll(); } },
          ...(onNeedsReview
            ? [{ label: 'Felder prüfen', variant: 'secondary' as const, onPress: () => { hideSheet(); onNeedsReview(rawPageUris); } }]
            : []),
          { label: 'Neu scannen',      variant: 'secondary', onPress: () => { hideSheet(); clearPages(); setMode('camera'); } },
        ],
      });
    }
  }, [pages, recognizeCaptures, attachOcr, finalizeDocument, analyzeAndReview, attachMetadata, clearPages, setMode, showSheet, hideSheet, onComplete, dispatchOptimistic, onOptimisticFail, onNeedsReview]);

  return { handleProcessAll };
}
