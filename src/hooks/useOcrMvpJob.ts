import { useState, useRef, useCallback } from 'react';
import { analyzeDocument, getOcrResult } from '@/services/ocrMvpApi';
import type { OcrMvpFile, OcrMvpForceType, OcrMvpJobStatus } from '@/services/ocrMvpApi';

const POLL_INTERVAL_MS  = 1_000;
const POLL_TIMEOUT_MS   = 90_000;   // poll_timeout: genel polling süresi
const UPLOAD_TIMEOUT_MS = 20_000;   // upload_timeout: upload AbortController

export type OcrMvpStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error' | 'timeout';

export type OcrMvpErrorKind = 'network' | 'server' | 'timeout' | null;

export interface UseOcrMvpJobReturn {
  status:    OcrMvpStatus;
  jobId:     string | null;
  result:    OcrMvpJobStatus | null;
  error:     string | null;
  errorKind: OcrMvpErrorKind;
  startJob:  (
    file: OcrMvpFile,
    forceType?: OcrMvpForceType,
    meta?: { sourceType?: string; pageCount?: number },
    timing?: Partial<OcrMvpTimingCallbacks>,
  ) => Promise<void>;
  reset:     () => void;
}

export interface OcrMvpTimingCallbacks {
  onUploadStart: () => void;
  onUploadFinished: () => void;
  onJobCreated: (jobId: string) => void;
  onPollingStarted: (jobId: string) => void;
  onPollingResult: (jobId: string, status: OcrMvpJobStatus['status']) => void;
  onDuplicate?: (existingDocId: string) => void;
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

  const poll = useCallback((id: string, timing?: Partial<OcrMvpTimingCallbacks>) => {
    timing?.onPollingStarted?.(id);
    const inFlight = { current: false };

    const doPoll = async () => {
      if (inFlight.current) return;
      if (Date.now() - startedRef.current >= POLL_TIMEOUT_MS) {
        clearTimer();
        setStatus('timeout');
        setError('İşlem uzun sürdü. Lütfen tekrar deneyin.');
        return;
      }
      inFlight.current = true;
      try {
        const data = await getOcrResult(id);
        if (data.status === 'done' || data.status === 'error') {
          timing?.onPollingResult?.(id, data.status);
        }
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
      } catch (e) {
        // poll_request_timeout: getOcrResult'ın 15 s AbortController'ı tetiklendi.
        // Tek attempt başarısız — job fail etme, inFlight finally'de temizlenir, loop devam eder.
        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }
        clearTimer();
        setError(e instanceof Error ? e.message : null);
        setErrorKind('network');
        setStatus('error');
      } finally {
        inFlight.current = false;
      }
    };

    doPoll();
    timerRef.current = setInterval(doPoll, POLL_INTERVAL_MS);
  }, []);

  const startJob = useCallback(async (
    file: OcrMvpFile,
    forceType?: OcrMvpForceType,
    meta?: { sourceType?: string; pageCount?: number },
    timing?: Partial<OcrMvpTimingCallbacks>,
  ) => {
    clearTimer();
    setStatus('uploading');
    setJobId(null);
    setResult(null);
    setError(null);

    const abortCtrl = new AbortController();
    const uploadTimer = setTimeout(() => abortCtrl.abort(), UPLOAD_TIMEOUT_MS);
    try {
      timing?.onUploadStart?.();
      const { job_id } = await analyzeDocument(file, forceType, abortCtrl.signal, meta);
      clearTimeout(uploadTimer);
      timing?.onUploadFinished?.();
      setJobId(job_id);
      timing?.onJobCreated?.(job_id);
      setStatus('processing');
      startedRef.current = Date.now();
      poll(job_id, timing);
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
