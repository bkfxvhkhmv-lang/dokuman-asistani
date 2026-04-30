import { useCallback } from 'react';
import { optimizeDocumentImage } from '@/modules/image-processing/engine/SkiaDocumentOptimizer';

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
  attachMetadata: (id: string, data: any) => void;
  clearPages: () => void;
  setMode: (mode: 'camera' | 'batch' | 'processing') => void;
  showSheet: (cfg: any) => void;
  hideSheet: () => void;
  onComplete: (savedId?: string) => void;
  dispatchOptimistic?: (pages: Array<{ uri: string }>) => string;
  onOptimisticFail?: (id: string) => void;
}

export function useProcessingHandler({
  pages, recognizeCaptures, attachOcr, finalizeDocument, attachMetadata,
  clearPages, setMode, showSheet, hideSheet, onComplete, dispatchOptimistic,
  onOptimisticFail,
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
      if (!ocrResult) throw new Error('OCR fehlgeschlagen — kein Ergebnis erhalten.');

      orderedPages.forEach((page, index) => {
        attachOcr(page.id, {
          text:       ocrResult.pages[index]?.text || '',
          confidence: ocrResult.pages[index]?.confidence || 0,
          blocks:     [],
        });
      });

      const rawText = ocrResult.text?.trim() || '';
      if (rawText.length < 10) {
        throw new Error(
          'Kein Text erkannt.\n\nMögliche Ursachen:\n• Vision API-Key ungültig oder Kontingent erschöpft\n• Kein Netzwerk\n• Dokument zu klein oder unscharf'
        );
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

      const message = e instanceof Error ? e.message : 'Fehler bei der Analyse';
      showSheet({
        title:   'Fehler',
        message,
        icon:    'alert-circle',
        tone:    'danger',
        actions: [
          { label: 'Erneut versuchen', variant: 'primary',   onPress: () => { hideSheet(); handleProcessAll(); } },
          { label: 'Abbrechen',        variant: 'secondary', onPress: () => { hideSheet(); setMode('camera'); } },
        ],
      });
    }
  }, [pages, recognizeCaptures, attachOcr, finalizeDocument, attachMetadata, clearPages, setMode, showSheet, hideSheet, onComplete, dispatchOptimistic, onOptimisticFail]);

  return { handleProcessAll };
}
