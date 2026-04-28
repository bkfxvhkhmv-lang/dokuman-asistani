import { useState, useCallback } from 'react';
import { hybridSearch, smartSearch } from '../services/v4Api';
import { filterBySearch, parseNatuerlicheAbfrage } from '../utils';

export function useSearch() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRemote = useCallback(async (
    query: string,
    options?: { topK?: number; ftsWeight?: number; vectorWeight?: number }
  ): Promise<any[]> => {
    if (!query.trim()) return [];
    setLoading(true);
    setError(null);
    try {
      const hits = await hybridSearch(query, options);
      setResults(hits ?? []);
      return hits ?? [];
    } catch {
      try {
        const hits = await smartSearch(query, options);
        setResults(hits ?? []);
        return hits ?? [];
      } catch (e: any) {
        setError(e?.message ?? 'Suche fehlgeschlagen');
        return [];
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const searchLocal = useCallback((
    docs: any[],
    options: Parameters<typeof filterBySearch>[1]
  ): any[] => {
    return filterBySearch(docs, options);
  }, []);

  const parseQuery = useCallback((query: string) => {
    return parseNatuerlicheAbfrage(query);
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, searchRemote, searchLocal, parseQuery, clear };
}
