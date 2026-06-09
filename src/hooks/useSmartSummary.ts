import { useState, useCallback, useEffect } from 'react';
import {
  buildLocalSummary,
  buildSmartSummary,
  getCachedSummary,
  cacheSummary,
  type SummaryResult,
  type SummaryMode,
} from '@/services/SmartSummaryService';
import type { Dokument } from '@/store';
import { useLangPreference } from '@/hooks/useLangPreference';

export function useSmartSummary(dok: Dokument | null, defaultMode: SummaryMode = 'mittel') {
  const [mode, setMode] = useState<SummaryMode>(defaultMode);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = { current: true };
  const { lang: appLang } = useLangPreference();

  // Build local summary instantly on mount
  useEffect(() => {
    if (!dok) { setResult(null); return; }
    setResult(buildLocalSummary(dok, mode));
  }, [dok, mode]);

  const loadDetailed = useCallback(async () => {
    if (!dok) return;
    setLoading(true);
    try {
      // Check cache first
      const cached = await getCachedSummary(dok.id, 'detailliert');
      if (cached) { setResult(cached); return; }

      const hybrid = await buildSmartSummary(dok, 'detailliert', appLang);
      setResult(hybrid);
      if (hybrid.quelle === 'ki_cloud') {
        await cacheSummary(dok.id, 'detailliert', hybrid);
      }
    } finally {
      setLoading(false);
    }
  }, [dok, appLang]);

  return { result, mode, setMode, loading, loadDetailed };
}
