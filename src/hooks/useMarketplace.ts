import { useState } from 'react';
import {
  useMarketplaceQuery,
  useInstallRuleMutation,
  useUninstallRuleMutation,
  useRateRuleMutation,
} from './queryHooks';
import type { MarketplaceRule } from '../services/v4Api';

interface MarketplaceParams {
  category?: string;
  tag?:      string;
  q?:        string;
  limit?:    number;
}

/**
 * Marketplace hook — stale-while-revalidate via TanStack Query.
 * On first visit: fetches and caches. On revisit: shows cached data instantly,
 * refetches in background if cache is stale (> 5 min).
 */
export function useMarketplace(params: MarketplaceParams = {}) {
  const query     = useMarketplaceQuery(params);
  const installM  = useInstallRuleMutation();
  const uninstallM= useUninstallRuleMutation();
  const rateM     = useRateRuleMutation();

  const rules: MarketplaceRule[] = query.data ?? [];

  const install = async (ruleId: string, config?: Record<string, unknown>): Promise<boolean> => {
    try {
      await installM.mutateAsync({ ruleId, config });
      return true;
    } catch { return false; }
  };

  const uninstall = async (ruleId: string): Promise<boolean> => {
    try {
      await uninstallM.mutateAsync(ruleId);
      return true;
    } catch { return false; }
  };

  const rate = async (ruleId: string, score: number, comment?: string): Promise<boolean> => {
    try {
      await rateM.mutateAsync({ ruleId, score, comment });
      return true;
    } catch { return false; }
  };

  return {
    rules,
    loading: query.isLoading,
    error:   query.error ? (query.error as Error).message ?? 'Laden fehlgeschlagen' : null,
    isStale: query.isStale,
    refetch: query.refetch,
    install,
    uninstall,
    rate,
  };
}
