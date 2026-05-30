import { useState, useRef, useCallback } from 'react';
import { analyzeDocument, getOcrResult } from '@/services/ocrMvpApi';
import type { OcrMvpFile, OcrMvpForceType, OcrMvpJobStatus } from '@/services/ocrMvpApi';

const POLL_INTERVAL_MS  = 2000;
const POLL_TIMEOUT_MS   = 30_000;
const UPLOAD_TIMEOUT_MS = 20_000;

export type OcrMvpStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error' | 'timeout';

export type OcrMvpErrorKind = 'network' | 'server' | 'timeout' | null;

export interface UseOcrMvpJobReturn {
  status:    OcrMvpStatus;
  jobId:     string | null;
  result:    OcrMvpJobStatus | null;
  error:     string | null;
  errorKind: OcrMvpErrorKind;
  startJob:  (file: OcrMvpFile, forceType?: OcrMvpForceType, meta?: { sourceType?: string; pageCount?: number }) => Promise<void>;
  reset:     () => void;
}

export function useOcrMvpJob(): UseOcrMvpJobReturn {
  const [status,    setStatus]    = useState<OcrMvpStatus>('idle');
  const [jobId,     setJobId]     = useState<string | null>(null);
  const [result,    setResult]    = useState<OcrMvpJobStatus | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<OcrMvpErrorKind>(null);

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef<number>(0);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const poll = useCallback((id: string) => {
    timerRef.current = setInterval(async () => {
      if (Date.now() - startedRef.current >= POLL_TIMEOUT_MS) {
        clearTimer();
        setStatus('timeout');
        setError('İşlem uzun sürdü. Lütfen tekrar deneyin.');
        return;
      }

      try {
        const data = await getOcrResult(id);

        if (data.status === 'done') {
          clearTimer();
          setResult(data);
          setStatus('done');
        } else if (data.status === 'error') {
          clearTimer();
          setError(data.error ?? null);
          setErrorKind('server');
          setStatus('error');
        }
        // status === 'processing' → interval devam eder
      } catch (e) {
        clearTimer();
        setError(e instanceof Error ? e.message : null);
        setErrorKind('network');
        setStatus('error');
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const startJob = useCallback(async (
    file: OcrMvpFile,
    forceType?: OcrMvpForceType,
    meta?: { sourceType?: string; pageCount?: number },
  ) => {
    clearTimer();
    setStatus('uploading');
    setJobId(null);
    setResult(null);
    setError(null);

    const abortCtrl = new AbortController();
    const uploadTimer = setTimeout(() => abortCtrl.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const { job_id } = await analyzeDocument(file, forceType, abortCtrl.signal, meta);
      clearTimeout(uploadTimer);
      setJobId(job_id);
      setStatus('processing');
      startedRef.current = Date.now();
      poll(job_id);
    } catch (e) {
      clearTimeout(uploadTimer);
      const isAbort = e instanceof Error && e.name === 'AbortError';
      setError(e instanceof Error ? e.message : null);
      setErrorKind(isAbort ? 'timeout' : 'network');
      setStatus(isAbort ? 'timeout' : 'error');
    }
  }, [poll]);

  const reset = useCallback(() => {
    clearTimer();
    setStatus('idle');
    setJobId(null);
    setResult(null);
    setError(null);
    setErrorKind(null);
  }, []);

  return { status, jobId, result, error, errorKind, startJob, reset };
}
