/**
 * TanStack Query hooks — stale-while-revalidate layer for all server state.
 * Local document state remains in the useReducer store; these hooks handle
 * read-only server data that benefits from background caching.
 */

import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import {
  browseMarketplace, getHealthStatus,
  explainDocumentSafe, installRule, uninstallRule, rateRule,
} from '../services/v4Api';
import type { MarketplaceRule } from '../services/v4Api';
import type { Dokument } from '../store';
import type { DocumentDigitalTwinModel } from '../core/intelligence/DocumentDigitalTwin';

// ── Query keys (centralised to avoid string typos) ────────────────────────

export const QK = {
  health:      ['health']                     as const,
  marketplace: (params: object) => ['marketplace', params] as const,
  explain:     (docId: string)  => ['explain', docId]      as const,
  twin:        (dokId: string)  => ['digital-twin', dokId] as const,
} as const;

// ── Server health — polled every 60 s ─────────────────────────────────────

export function useHealthQuery() {
  return useQuery({
    queryKey:  QK.health,
    queryFn:   () => getHealthStatus(),
    staleTime: 45_000,
    gcTime:    2 * 60 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry:      1,               // 1 retry before showing offline banner
    retryDelay: 3000,            // wait 3s before retry (not immediate)
  });
}

// ── Marketplace — stale-while-revalidate, 5-min cache ────────────────────

interface MarketplaceParams {
  category?: string;
  tag?:      string;
  q?:        string;
  limit?:    number;
}

export function useMarketplaceQuery(params: MarketplaceParams = {}) {
  return useQuery<MarketplaceRule[]>({
    queryKey:  QK.marketplace(params),
    queryFn:   async () => {
      const raw = await browseMarketplace(params as Record<string, string | number | undefined>);
      return Array.isArray(raw) ? raw : ((raw as { rules?: MarketplaceRule[] })?.rules ?? []);
    },
    staleTime: 5 * 60 * 1000,   // 5 min — user sees instant data on revisit
    gcTime:    15 * 60 * 1000,  // 15 min in-memory
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (prev) => prev, // keep old data while fetching (no flash)
  });
}

// ── AI Explain — cached per docId, background revalidate after 10 min ─────

export function useExplainDocumentQuery(docId: string | null | undefined, lang?: string) {
  return useQuery({
    queryKey:  QK.explain(docId ?? ''),
    queryFn:   () => explainDocumentSafe(docId!, lang),
    enabled:   !!docId,
    staleTime: 10 * 60 * 1000,  // 10 min — explanations rarely change
    gcTime:    30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// ── Marketplace mutations ─────────────────────────────────────────────────

export function useInstallRuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, config }: { ruleId: string; config?: Record<string, unknown> }) =>
      installRule(ruleId, config),

    // Optimistic: mark rule as installed before server confirms
    onMutate: async ({ ruleId }) => {
      await qc.cancelQueries({ queryKey: ['marketplace'] });
      const snapshots = qc.getQueriesData<MarketplaceRule[]>({ queryKey: ['marketplace'] });
      qc.setQueriesData<MarketplaceRule[]>({ queryKey: ['marketplace'] }, old =>
        old?.map(r => r.id === ruleId ? { ...r, installed: true } : r),
      );
      return { snapshots };
    },
    // Rollback on error
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
}

export function useUninstallRuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => uninstallRule(ruleId),

    onMutate: async (ruleId) => {
      await qc.cancelQueries({ queryKey: ['marketplace'] });
      const snapshots = qc.getQueriesData<MarketplaceRule[]>({ queryKey: ['marketplace'] });
      qc.setQueriesData<MarketplaceRule[]>({ queryKey: ['marketplace'] }, old =>
        old?.map(r => r.id === ruleId ? { ...r, installed: false } : r),
      );
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
}

export function useRateRuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, score, comment }: { ruleId: string; score: number; comment?: string }) =>
      rateRule(ruleId, score, comment ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace'] });
    },
  });
}

// ── Digital Twin — local computation cached per dokId ─────────────────────

export function useDigitalTwinQuery(dok: Dokument | undefined) {
  return useQuery<DocumentDigitalTwinModel>({
    queryKey:  QK.twin(dok?.id ?? ''),
    queryFn:   async () => {
      const { DocumentDigitalTwin } = await import('../core/intelligence/DocumentDigitalTwin');
      return DocumentDigitalTwin.build(dok!);
    },
    enabled:   !!dok,
    staleTime: 5  * 60 * 1000,
    gcTime:    15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 0,
  });
}

// ── Predictive pre-fetcher — call from list components ───────────────────
// Fire-and-forget: errors are swallowed so the list never throws.

export async function prefetchDocumentData(
  queryClient: QueryClient,
  dok: Dokument,
): Promise<void> {
  // 1. Digital Twin — local async computation (most expensive, biggest win)
  queryClient.prefetchQuery({
    queryKey:  QK.twin(dok.id),
    queryFn:   async () => {
      const { DocumentDigitalTwin } = await import('../core/intelligence/DocumentDigitalTwin');
      return DocumentDigitalTwin.build(dok);
    },
    staleTime: 5 * 60 * 1000,
  }).catch(() => null);

  // 2. AI Explanation — server call (only if doc has a v4 id)
  if (dok.v4DocId) {
    queryClient.prefetchQuery({
      queryKey:  QK.explain(dok.id),
      queryFn:   () => explainDocumentSafe(dok.v4DocId!),
      staleTime: 10 * 60 * 1000,
    }).catch(() => null);
  }
}
