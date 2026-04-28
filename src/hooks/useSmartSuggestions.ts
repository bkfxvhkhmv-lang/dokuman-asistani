/**
 * useSmartSuggestions — V12 Sprint 2
 * Wraps SmartSuggestionsService with React state + action dispatch.
 */

import { useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  runSmartSuggestions,
  runHomeSuggestions,
  type Suggestion,
} from '../services/SmartSuggestionsService';
import type { Dokument } from '../store';

interface UseSuggestionsActions {
  onZahlen?: () => void;
  onEinspruch?: () => void;
  onPdfExport?: () => void;
  onTeilen?: () => void;
  onArchivieren?: () => void;
  onKalender?: () => void;
  onErinnerung?: () => void;
  onErklären?: () => void;
  onKündigen?: () => void;
}

export function useDocumentSuggestions(dok: Dokument | null, actions: UseSuggestionsActions = {}) {
  const result = useMemo(() => (dok ? runSmartSuggestions(dok) : null), [dok]);

  const handleSuggestion = useCallback((suggestion: Suggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (suggestion.aktion) {
      case 'zahlen':       actions.onZahlen?.();    break;
      case 'einspruch':    actions.onEinspruch?.(); break;
      case 'pdf_export':   actions.onPdfExport?.(); break;
      case 'teilen':       actions.onTeilen?.();    break;
      case 'archivieren':  actions.onArchivieren?.(); break;
      case 'kalender':     actions.onKalender?.();  break;
      case 'erinnerung':   actions.onErinnerung?.(); break;
      case 'erklären':     actions.onErklären?.();  break;
      case 'kündigen':     actions.onKündigen?.();  break;
    }
  }, [actions]);

  return {
    result,
    suggestions:    result?.suggestions ?? [],
    topSuggestion:  result?.topSuggestion ?? null,
    kritisch:       result?.kategorien.kritisch ?? [],
    hoch:           result?.kategorien.hoch ?? [],
    mittel:         result?.kategorien.mittel ?? [],
    niedrig:        result?.kategorien.niedrig ?? [],
    handleSuggestion,
  };
}

export function useHomeSuggestions(docs: Dokument[]) {
  const router = useRouter();
  const suggestions = useMemo(() => runHomeSuggestions(docs), [docs]);

  const handleHomeSuggestion = useCallback((aktion: string, dokId?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (dokId) {
      router.push({ pathname: '/detail', params: { dokId } });
    }
    // Route to filtered views
  }, [router]);

  return { suggestions, handleHomeSuggestion };
}
