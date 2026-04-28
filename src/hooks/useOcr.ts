import { useState, useCallback, useRef } from 'react';
import { OcrManager } from '../core/ocr/OcrManager';
import type { OcrManagerResult, OcrBatchResult } from '../core/ocr/OcrManager';
export type { OcrBatchResult };
import type { OcrCaptureInput } from '../modules/ocr/types';

export function useOcr() {
  const managerRef = useRef(new OcrManager());

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OcrManagerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognize = useCallback(async (imageUri: string): Promise<OcrManagerResult | null> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const r = await managerRef.current.recognize(imageUri);
      setProgress(100);
      setResult(r);
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCR fehlgeschlagen');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const recognizeBatch = useCallback(async (captures: OcrCaptureInput[]): Promise<OcrBatchResult | null> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const r = await managerRef.current.recognizeBatch(captures);
      setProgress(100);
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch OCR fehlgeschlagen');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const getProvider = useCallback(() => managerRef.current.getActiveProvider(), []);

  return {
    isProcessing,
    progress,
    result,
    error,
    recognize,
    recognizeBatch,
    getProvider,
  };
}
