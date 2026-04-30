import { DeltaSyncResultSchema } from '@/services/zodSchemas';
import { BASE, req } from './client';
import type {
  Approval,
  DeltaSyncResult,
  EventReplayResult,
  MarketplaceRule,
  MarketplaceRuleList,
  PricingForecast,
  SearchResult,
  ShareLink,
  TimelineResponse,
} from './types';

export async function createShareLink(docId: string, ttl = '7d', maxViews = 0): Promise<ShareLink> {
  return req<ShareLink>('POST', `/share/${docId}`, { ttl, max_views: maxViews });
}

export async function revokeShareLink(token: string): Promise<unknown> {
  return req('DELETE', `/share/${token}`);
}

export async function getTimeline(docId: string): Promise<TimelineResponse> {
  return req<TimelineResponse>('GET', `/timeline/${docId}`);
}

export async function hybridSearch(
  query: string,
  { topK = 10, ftsWeight = 0.5, vectorWeight = 0.5 } = {},
): Promise<SearchResult[]> {
  return req<SearchResult[]>('POST', '/search/', { query, top_k: topK, fts_weight: ftsWeight, vector_weight: vectorWeight });
}

export async function browseMarketplace({
  category, tag, q, limit = 20,
}: { category?: string; tag?: string; q?: string; limit?: number } = {}): Promise<MarketplaceRuleList | MarketplaceRule[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (tag)      params.set('tag', tag);
  if (q)        params.set('q', q);
  params.set('limit', String(limit));
  return req<MarketplaceRuleList | MarketplaceRule[]>('GET', `/marketplace/rules?${params}`);
}

export async function installRule(ruleId: string, config: unknown = null): Promise<unknown> {
  return req('POST', `/marketplace/rules/${ruleId}/install`, { config });
}

export async function uninstallRule(ruleId: string): Promise<unknown> {
  return req('DELETE', `/marketplace/rules/${ruleId}/install`);
}

export async function rateRule(ruleId: string, score: number, comment: string | null = null): Promise<unknown> {
  return req('POST', `/marketplace/rules/${ruleId}/rate`, { score, comment });
}

export async function getPendingApprovals(orgId: string): Promise<Approval[] | { requests: Approval[] }> {
  return req<Approval[] | { requests: Approval[] }>('GET', `/orgs/${orgId}/approvals/pending`);
}

export async function resolveApproval(requestId: string, decision: string, comment: string | null = null): Promise<unknown> {
  return req('POST', `/approvals/${requestId}/resolve`, { decision, comment });
}

export async function getPricingForecast(horizonDays = 90): Promise<PricingForecast> {
  return req<PricingForecast>('GET', `/pricing/forecast?horizon_days=${horizonDays}`);
}

export async function getSubscriptionAdvice(): Promise<unknown> {
  return req('GET', `/pricing/subscriptions/advice`);
}

export async function deltaSync(since: string): Promise<DeltaSyncResult> {
  const raw = await req('GET', `/sync/delta?since=${encodeURIComponent(since)}`);
  return DeltaSyncResultSchema.parse(raw);
}

export async function eventReplay(fromEventId = 0): Promise<EventReplayResult> {
  return req<EventReplayResult>('GET', `/sync/replay?from_event_id=${fromEventId}`);
}

export async function resolveConflict(docId: string, strategy = 'server_always'): Promise<unknown> {
  return req('POST', `/sync/conflicts/${docId}/resolve`, { strategy });
}

/** Öffentikit endpoint — auth kullanılmaz. */
export async function getHealthStatus(): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${BASE}/health/`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Health ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
