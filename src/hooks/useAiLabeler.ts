import { useState, useCallback } from 'react';
import { shouldLabel, labelDocument, type AiLabelerResult } from '@/services/AiLabelerService';
import type { Dokument } from '@/store/types';
import { useStore } from '@/store';

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
 */
export function useAiLabeler(dok: Dokument) {
  const { dispatch } = useStore();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AiLabelerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEligible = shouldLabel(dok);

  const triggerLabel = useCallback(async () => {
    if (!dok.v4DocId || !dok.rohText) return;
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const result = await labelDocument({
        v4DocId: dok.v4DocId,
        rohText: dok.rohText,
        titel: dok.titel,
        typ: dok.typ,
        absender: dok.absender,
      });
      if (!result) {
        setError('Das Dokument konnte nicht sicher besser erkannt werden.');
      } else {
        setSuggestion(result);
      }
    } catch {
      setError('Das Dokument konnte nicht sicher besser erkannt werden.');
    } finally {
      setLoading(false);
    }
  }, [dok.v4DocId, dok.rohText, dok.titel, dok.typ, dok.absender]);

  const acceptSuggestion = useCallback(() => {
    if (!suggestion) return;
    dispatch({
      type: 'UPDATE_DOKUMENT',
      payload: {
        id: dok.id,
        aiDisplayTitle: suggestion.response.displayTitle,
        aiDocumentType: suggestion.response.documentType,
        ...(suggestion.response.sender ? { aiSender: suggestion.response.sender } : {}),
        aiConfidence: suggestion.response.confidence,
        aiLabelledAt: new Date().toISOString(),
      },
    });
    setSuggestion(null);
  }, [suggestion, dok.id, dispatch]);

  const ignoreSuggestion = useCallback(() => {
    // v1: no persistence on ignore — user can retry manually later
    setSuggestion(null);
    setError(null);
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
