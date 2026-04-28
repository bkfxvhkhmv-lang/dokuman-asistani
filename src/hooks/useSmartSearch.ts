/**
 * useSmartSearch — V12 Sprint 3
 * Hybrid local-first + optional online semantic merge.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { runSmartSearch, buildSearchIndex, type SearchResponse } from '../services/SmartSearchService';
import { hybridSearch } from '../services/v4Api';
import { isOnline } from '../services/offlineQueue';
import type { Dokument } from '../store';

const DEBOUNCE_MS = 280;
const MIN_QUERY_ONLINE = 3;

export function useSmartSearch(docs: Dokument[]) {
  const [query, setQuery]           = useState('');
  const [localResult, setLocalResult] = useState<SearchResponse | null>(null);
  const [onlineIds, setOnlineIds]   = useState<string[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [errorOnline, setErrorOnline] = useState(false);
  const [semanticMode, setSemanticMode] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Pre-built index for instant lookup
  const index = useMemo(() => buildSearchIndex(docs), [docs]);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);

    if (!q.trim()) {
      setLocalResult(null);
      setOnlineIds([]);
      return;
    }

    timer.current = setTimeout(() => {
      // Local search — instant
      const result = runSmartSearch(q, docs);
      if (mountedRef.current) setLocalResult(result);

      // Online semantic — only when enabled and query is long enough
      if (semanticMode && q.trim().length >= MIN_QUERY_ONLINE) {
        isOnline().then(online => {
          if (!online || !mountedRef.current) return;
          setLoadingOnline(true);
          setErrorOnline(false);
          hybridSearch(q, { topK: 15 })
            .then(hits => {
              if (!mountedRef.current) return;
              setOnlineIds(hits.map(h => (h as any).doc_id ?? (h as any).id ?? '').filter(Boolean));
            })
            .catch(() => { if (mountedRef.current) setErrorOnline(true); })
            .finally(() => { if (mountedRef.current) setLoadingOnline(false); });
        });
      } else {
        setOnlineIds([]);
      }
    }, DEBOUNCE_MS);
  }, [docs, semanticMode]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setLocalResult(null);
    setOnlineIds([]);
    setErrorOnline(false);
  }, []);

  const toggleSemantic = useCallback(() => {
    setSemanticMode(v => !v);
    setOnlineIds([]);
  }, []);

  // Merge: local results + online re-rank
  const mergedResults = useMemo(() => {
    if (!localResult) return [];
    if (onlineIds.length === 0) return localResult.results;

    // Boost docs found by semantic search
    return localResult.results
      .map(r => ({
        ...r,
        score: onlineIds.includes(r.dok.id) ? Math.min(100, r.score + 20) : r.score,
      }))
      .sort((a, b) => b.score - a.score);
  }, [localResult, onlineIds]);

  return {
    query,
    search,
    clearSearch,
    mergedResults,
    intent:           localResult?.intent ?? 'freitext',
    intentLabel:      localResult?.intentLabel ?? '',
    totalFound:       localResult?.totalFound ?? 0,
    correctionHint:   localResult?.correctionHint ?? null,
    processingMs:     localResult?.processingMs ?? 0,
    loadingOnline,
    errorOnline,
    semanticMode,
    toggleSemantic,
  };
}
