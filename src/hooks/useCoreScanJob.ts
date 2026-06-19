import { useState, useRef, useCallback } from 'react';
import { uploadDocumentV4Safe } from '@/services/v4FileService';
import { getDocumentV4, getDocumentWorkerResult } from '@/services/v4-api/documents';
import {
  hasWorkerResultAiMeta,
  workerResultToOcrMvpStatus,
  WORKER_RESULT_META_RETRY_MAX,
  WORKER_RESULT_META_RETRY_MS,
} from '@/features/ocr-mvp/adapters/workerResultToOcrMvpStatus';
import type { OcrMvpFile, OcrMvpForceType, OcrMvpJobStatus } from '@/services/ocrMvpApi';
import type {
  OcrMvpErrorKind,
  OcrMvpStatus,
  OcrMvpTimingCallbacks,
  UseOcrMvpJobReturn,
} from '@/hooks/useOcrMvpJob';

const POLL_INTERVAL_MS = 2_600;
const POLL_ERROR_RETRY_MS = 4_000;
const POLL_TIMEOUT_MS = 90_000;
const MAX_POLL_TRIES = 48;

export type UseCoreScanJobReturn = UseOcrMvpJobReturn & {
  duplicateDetected: boolean;
};

function normalizeV4Status(raw: unknown): 'pending' | 'processing' | 'completed' | 'failed' | null {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!s) return null;
  if (s === 'pending' || s === 'processing' || s === 'completed' || s === 'failed') return s;
  return null;
}

export function useCoreScanJob(): UseCoreScanJobReturn {
  const [status, setStatus] = useState<OcrMvpStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<OcrMvpJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<OcrMvpErrorKind>(null);
  const [duplicateDetected, setDuplicateDetected] = useState(false);

  const pollGenRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(0);

  const clearPoll = useCallback(() => {
    pollGenRef.current += 1;
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const schedulePoll = useCallback((fn: () => void, delayMs: number) => {
    pollTimerRef.current = setTimeout(fn, delayMs);
  }, []);

  const finishWhenResultReady = useCallback(async (
    remoteId: string,
    timingCb: Partial<OcrMvpTimingCallbacks> | undefined,
    gen: number,
    metaAttempt = 0,
  ): Promise<void> => {
    const wr = await getDocumentWorkerResult(remoteId);
    if (gen !== pollGenRef.current) return;

    const metaReady = hasWorkerResultAiMeta(wr);
    if (!metaReady && metaAttempt < WORKER_RESULT_META_RETRY_MAX) {
      schedulePoll(
        () => void finishWhenResultReady(remoteId, timingCb, gen, metaAttempt + 1),
        WORKER_RESULT_META_RETRY_MS,
      );
      return;
    }

    timingCb?.onPollingResult?.(remoteId, 'done');
    setResult(workerResultToOcrMvpStatus(wr, remoteId));
    setStatus('done');
  }, [schedulePoll]);

  const poll = useCallback((remoteDocId: string, timing?: Partial<OcrMvpTimingCallbacks>) => {
    const gen = pollGenRef.current;
    timing?.onPollingStarted?.(remoteDocId);
    startedRef.current = Date.now();
    let tries = 0;

    const failTimeout = () => {
      setStatus('timeout');
      setErrorKind('timeout');
      setError('İşlem uzun sürdü. Lütfen tekrar deneyin.');
    };

    const tick = async (): Promise<void> => {
      if (gen !== pollGenRef.current) return;
      tries += 1;

      if (Date.now() - startedRef.current >= POLL_TIMEOUT_MS) {
        failTimeout();
        return;
      }

      try {
        const d = await getDocumentV4(remoteDocId);
        if (gen !== pollGenRef.current) return;

        const st = normalizeV4Status(d.status);
        if (st === 'failed') {
          timing?.onPollingResult?.(remoteDocId, 'error');
          setError('Analysefehler');
          setErrorKind('server');
          setStatus('error');
          return;
        }

        if (st === 'completed') {
          await finishWhenResultReady(remoteDocId, timing, gen);
          return;
        }

        if (tries >= MAX_POLL_TRIES) {
          failTimeout();
          return;
        }

        schedulePoll(() => void tick(), POLL_INTERVAL_MS);
      } catch (e) {
        if (gen !== pollGenRef.current) return;
        if (tries >= MAX_POLL_TRIES) {
          setError(e instanceof Error ? e.message : null);
          setErrorKind('network');
          setStatus('error');
          return;
        }
        schedulePoll(() => void tick(), POLL_ERROR_RETRY_MS);
      }
    };

    const finishWhenResultReady = async (
      remoteId: string,
      timingCb: Partial<OcrMvpTimingCallbacks> | undefined,
      gen: number,
      metaAttempt = 0,
    ): Promise<void> => {
      const wr = await getDocumentWorkerResult(remoteId);
      if (gen !== pollGenRef.current) return;

      const metaReady = hasWorkerResultAiMeta(wr);
      if (!metaReady && metaAttempt < WORKER_RESULT_META_RETRY_MAX) {
        schedulePoll(
          () => void finishWhenResultReady(remoteId, timingCb, gen, metaAttempt + 1),
          WORKER_RESULT_META_RETRY_MS,
        );
        return;
      }

      timingCb?.onPollingResult?.(remoteId, 'done');
      setResult(workerResultToOcrMvpStatus(wr, remoteId));
      setStatus('done');
    };

    void tick();
  }, [schedulePoll, finishWhenResultReady]);

  const startJob = useCallback(async (
    file: OcrMvpFile,
    _forceType?: OcrMvpForceType,
    _meta?: { sourceType?: string; pageCount?: number },
    timing?: Partial<OcrMvpTimingCallbacks>,
  ) => {
    clearPoll();
    setStatus('uploading');
    setJobId(null);
    setResult(null);
    setError(null);
    setErrorKind(null);
    setDuplicateDetected(false);

    const filename = file.name?.trim() || 'document.pdf';

    try {
      timing?.onUploadStart?.();
      const uploaded = await uploadDocumentV4Safe(file.uri, filename);
      timing?.onUploadFinished?.();

      const isDuplicate = uploaded.duplicate === true;
      const remoteDocId = (
        (isDuplicate && typeof uploaded.existing_document_id === 'string'
          ? uploaded.existing_document_id.trim()
          : '')
        || uploaded?.id?.trim()
      );
      if (!remoteDocId) {
        setError('Upload fehlgeschlagen');
        setErrorKind('server');
        setStatus('error');
        return;
      }

      if (isDuplicate) {
        setDuplicateDetected(true);
        timing?.onDuplicate?.(remoteDocId);
      }

      setJobId(remoteDocId);
      timing?.onJobCreated?.(remoteDocId);

      const uploadStatus = normalizeV4Status(uploaded.status);
      if (isDuplicate && uploadStatus === 'failed') {
        setError('Analysefehler');
        setErrorKind('server');
        setStatus('error');
        return;
      }

      setStatus('processing');

      if (isDuplicate && uploadStatus === 'completed') {
        timing?.onPollingStarted?.(remoteDocId);
        await finishWhenResultReady(remoteDocId, timing, pollGenRef.current);
        return;
      }

      poll(remoteDocId, timing);
    } catch (e) {
      setError(e instanceof Error ? e.message : null);
      setErrorKind('network');
      setStatus('error');
    }
  }, [clearPoll, poll, finishWhenResultReady]);

  const reset = useCallback(() => {
    clearPoll();
    setStatus('idle');
    setJobId(null);
    setResult(null);
    setError(null);
    setErrorKind(null);
    setDuplicateDetected(false);
  }, [clearPoll]);

  return { status, jobId, result, error, errorKind, duplicateDetected, startJob, reset };
}
