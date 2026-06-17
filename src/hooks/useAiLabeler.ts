import { useState, useCallback, useEffect, useRef } from 'react';
import {
  shouldLabel,
  fetchBackendLabel,
  type AiLabelerResult,
} from '@/services/AiLabelerService';
import { enqueueV4Upload } from '@/services/v4EnqueueUpload';
import { attachV4JobPolling } from '@/services/v4DocumentJobPoll';
import { buildAnalyseFileFromDocument } from '@/features/detail/utils/buildAnalyseFileFromDocument';
import type { Dokument } from '@/store/types';
import { useStoreDispatch } from '@/store/Provider';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

/**
 * Manual AI Labeler hook for the Detail screen.
 *
 * Rules:
 * - NOT called automatically on screen load.
 * - triggerLabel() is called only on user tap ("Besser erkennen").
 * - acceptSuggestion() persists aiLabel* fields via UPDATE_DOKUMENT.
 * - ignoreSuggestion() clears state but does NOT persist aiLabelledAt —
 *   user can retry later.
 * - customTitle is never modified here; display priority is handled elsewhere.
 * - The backend worker result is fetched from the core-api. Polling only
 *   tracks v4JobStatus; ai* fields are written only after the user accepts.
 */
export function useAiLabeler(dok: Dokument) {
  const dispatch = useStoreDispatch();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AiLabelerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobActive, setJobActive] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const safeSetLoading = useCallback((value: boolean) => {
    if (mountedRef.current) setLoading(value);
  }, []);

  const safeSetSuggestion = useCallback((value: AiLabelerResult | null) => {
    if (mountedRef.current) setSuggestion(value);
  }, []);

  const safeSetError = useCallback((value: string | null) => {
    if (mountedRef.current) {
      setError(value);
      if (value) setLoading(false);
    }
  }, []);

  const finalizeSuggestion = useCallback((result: AiLabelerResult | null) => {
    safeSetLoading(false);
    setJobActive(false);
    if (!result) {
      safeSetError(t(getLangSync(), 'besser.error'));
      return;
    }
    safeSetSuggestion(result);
  }, [safeSetError, safeSetLoading, safeSetSuggestion]);

  const fetchResultAndSuggest = useCallback(async (remoteDocId: string) => {
    try {
      const result = await fetchBackendLabel(remoteDocId);
      finalizeSuggestion(result);
    } catch {
      finalizeSuggestion(null);
    }
  }, [finalizeSuggestion]);

  const isEligible = shouldLabel(dok);

  const triggerLabel = useCallback(async () => {
    if (loading || jobActive) return;
    if (!shouldLabel(dok)) return;
    setError(null);
    setSuggestion(null);

    // Case 1: backend job already finished → fetch result directly.
    if (dok.v4DocId && dok.v4JobStatus === 'completed') {
      safeSetLoading(true);
      void fetchResultAndSuggest(dok.v4DocId);
      return;
    }

    // Case 2: backend job in flight → attach polling without applying the result.
    if (dok.v4DocId && (dok.v4JobStatus === 'pending' || dok.v4JobStatus === 'processing')) {
      setJobActive(true);
      safeSetLoading(true);
      attachV4JobPolling(dispatch, dok.id, dok.v4DocId, {
        suppressResultApply: true,
        onCompleted: remoteId => void fetchResultAndSuggest(remoteId),
        onFailed: () => finalizeSuggestion(null),
      });
      return;
    }

    // Case 3: no backend job yet → upload and poll.
    const file = buildAnalyseFileFromDocument(dok);
    if (!file) {
      safeSetError(t(getLangSync(), 'besser.error'));
      return;
    }

    setJobActive(true);
    safeSetLoading(true);
    enqueueV4Upload(dispatch, dok.id, file.uri, file.name ?? 'document.pdf', {
      suppressAlert: true,
      suppressResultApply: true,
      onCompleted: remoteId => void fetchResultAndSuggest(remoteId),
      onFailed: () => finalizeSuggestion(null),
    });
  }, [
    dispatch, dok, fetchResultAndSuggest,
    finalizeSuggestion, jobActive, loading, safeSetError, safeSetLoading,
  ]);

  // If the upload fails immediately (v4JobStatus becomes failed) while a
  // labeler job is active, surface the error and clear the active flag.
  useEffect(() => {
    if (jobActive && dok.v4JobStatus === 'failed') {
      finalizeSuggestion(null);
    }
  }, [dok.v4JobStatus, jobActive, finalizeSuggestion]);

  const acceptSuggestion = useCallback(() => {
    if (!suggestion) return;
    dispatch({
      type: 'UPDATE_DOKUMENT',
      payload: {
        id: dok.id,
        customTitle: suggestion.response.displayTitle,
        aiDocumentType: suggestion.response.documentType,
        ...(suggestion.response.sender ? { aiSender: suggestion.response.sender } : {}),
        aiConfidence: suggestion.response.confidence,
        aiLabelledAt: new Date().toISOString(),
      },
    });
    setSuggestion(null);
    setJobActive(false);
  }, [suggestion, dok.id, dispatch]);

  const ignoreSuggestion = useCallback(() => {
    // v1: no persistence on ignore — user can retry manually later
    setSuggestion(null);
    setError(null);
    setJobActive(false);
  }, []);

  return {
    isEligible,
    loading,
    suggestion,
    error,
    triggerLabel,
    acceptSuggestion,
    ignoreSuggestion,
  };
}
