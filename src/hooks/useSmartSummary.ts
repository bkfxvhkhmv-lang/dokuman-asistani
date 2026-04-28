import { useState, useCallback, useEffect } from 'react';
import {
  buildLocalSummary,
  buildSmartSummary,
  getCachedSummary,
  cacheSummary,
  type SummaryResult,
  type SummaryMode,
} from '../services/SmartSummaryService';
import type { Dokument } from '../store';

export function useSmartSummary(dok: Dokument | null, defaultMode: SummaryMode = 'mittel') {
  const [mode, setMode] = useState<SummaryMode>(defaultMode);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = { current: true };

  // Build local summary instantly on mount
  useEffect(() => {
    if (!dok) { setResult(null); return; }
    setResult(buildLocalSummary(dok, mode));
  }, [dok, mode]);

  const loadDetailed = useCallback(async (lang = 'de') => {
    if (!dok) return;
    setLoading(true);
    try {
      // Check cache first
      const cached = await getCachedSummary(dok.id, 'detailliert');
      if (cached) { setResult(cached); return; }

      const hybrid = await buildSmartSummary(dok, 'detailliert', lang);
      setResult(hybrid);
      if (hybrid.quelle === 'ki_cloud') {
        await cacheSummary(dok.id, 'detailliert', hybrid);
      }
    } finally {
      setLoading(false);
    }
  }, [dok]);

  return { result, mode, setMode, loading, loadDetailed };
}
