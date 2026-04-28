import { authFetch } from './authService';
import { API_BASE } from '../config';
import { withRetry } from './retryHelper';
import { getLang } from '../hooks/useLangPreference';
import { ExplainResultSchema, DeltaSyncResultSchema, type ExplainResult, type DeltaSyncResult } from './zodSchemas';

export const BASE = API_BASE;

// ── Response types ────────────────────────────────────────────────────────────

export interface V4Document {
  id: string;
  titel?: string;
  status?: string;
  [key: string]: unknown;
}

export interface V4DocumentList {
  items: V4Document[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface ShareLink {
  share_url: string;
  token: string;
  expires_at?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  [key: string]: unknown;
}

export type { ExplainResult } from './zodSchemas';

export interface MarketplaceRule {
  id: string;
  name: string;
  category?: string;
  installed?: boolean;
  avg_rating?: number;
  rating_count?: number;
  install_count?: number;
  author?: string;
  description?: string;
  tags?: string[];
  myRating?: number;
  [key: string]: unknown;
}

export interface MarketplaceRuleList {
  rules: MarketplaceRule[];
  [key: string]: unknown;
}

export interface Approval {
  id: string;
  status: string;
  [key: string]: unknown;
}

export interface PricingForecast {
  [key: string]: unknown;
}

export interface SyncDocument {
  id: string;
  user_id?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  checksum?: string;
  version?: number;
  updated_at?: string;
  [key: string]: unknown;
}

export type { DeltaSyncResult } from './zodSchemas';

export interface EventReplayResult {
  events: unknown[];
  last_event_id?: number;
}

export interface TimelineResponse {
  events?: Record<string, unknown>[];
  [key: string]: unknown;
}

// ── Internal request helper ───────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

const DEFAULT_TIMEOUT_MS = 15_000;

export async function req<T = unknown>(method: HttpMethod, path: string, body?: unknown, isForm = false, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const opts: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: {},
    signal: controller.signal,
  };
  if (body) {
    if (isForm) {
      opts.body = body as FormData;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  try {
    const res = await authFetch(`${BASE}${path}`, opts);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`V4 API ${res.status}: ${err}`);
    }
    return res.json() as Promise<T>;
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error(`V4 API timeout after ${timeoutMs}ms: ${path}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Documents ─────────────────────────────────────────────────────────────────

// Dosya operasyonları → v4FileService.ts (geriye dönük uyumluluk için re-export)
export { uploadDocumentV4, downloadDocumentV4, shareOriginalFile, downloadOriginalFileToCache, uploadDocumentV4Safe } from './v4FileService';

export async function getDocumentV4(docId: string): Promise<V4Document> {
  return req<V4Document>('GET', `/documents/${docId}`);
}

export async function listDocumentsV4({ limit = 50, offset = 0 } = {}): Promise<V4DocumentList> {
  return req<V4DocumentList>('GET', `/documents/?limit=${limit}&offset=${offset}`);
}

export async function deleteDocumentV4(docId: string): Promise<unknown> {
  return req('DELETE', `/documents/${docId}`);
}


// ── AI Explain ────────────────────────────────────────────────────────────────

export async function explainDocument(docId: string, lang?: string): Promise<ExplainResult> {
  const l = lang ?? await getLang();
  const raw = await req('POST', `/ai/explain/${docId}`, { lang: l });
  return ExplainResultSchema.parse(raw);
}

export async function getAiLanguages(): Promise<unknown> {
  return req('GET', '/ai/languages');
}

export async function chatWithDocument(docId: string, messages: unknown[], lang?: string): Promise<unknown> {
  const l = lang ?? await getLang();
  return req('POST', `/ai/chat/${docId}`, { messages, lang: l });
}

// ── Share ─────────────────────────────────────────────────────────────────────

export async function createShareLink(docId: string, ttl = '7d', maxViews = 0): Promise<ShareLink> {
  return req<ShareLink>('POST', `/share/${docId}`, { ttl, max_views: maxViews });
}

export async function revokeShareLink(token: string): Promise<unknown> {
  return req('DELETE', `/share/${token}`);
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export async function getTimeline(docId: string): Promise<TimelineResponse> {
  return req<TimelineResponse>('GET', `/timeline/${docId}`);
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function hybridSearch(
  query: string,
  { topK = 10, ftsWeight = 0.5, vectorWeight = 0.5 } = {},
): Promise<SearchResult[]> {
  return req<SearchResult[]>('POST', '/search/', { query, top_k: topK, fts_weight: ftsWeight, vector_weight: vectorWeight });
}

// ── Marketplace ───────────────────────────────────────────────────────────────

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

// ── Approvals ─────────────────────────────────────────────────────────────────

export async function getPendingApprovals(orgId: string): Promise<Approval[] | { requests: Approval[] }> {
  return req<Approval[] | { requests: Approval[] }>('GET', `/orgs/${orgId}/approvals/pending`);
}

export async function resolveApproval(requestId: string, decision: string, comment: string | null = null): Promise<unknown> {
  return req('POST', `/approvals/${requestId}/resolve`, { decision, comment });
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export async function getPricingForecast(horizonDays = 90): Promise<PricingForecast> {
  return req<PricingForecast>('GET', `/pricing/forecast?horizon_days=${horizonDays}`);
}

export async function getSubscriptionAdvice(): Promise<unknown> {
  return req('GET', `/pricing/subscriptions/advice`);
}

// ── Sync ──────────────────────────────────────────────────────────────────────

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

// ── Health ────────────────────────────────────────────────────────────────────

export async function getHealthStatus(): Promise<unknown> {
  // Plain fetch — no auth header, no semaphore, no retry overhead.
  // Health is a public endpoint; using authFetch causes unnecessary latency on startup.
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

// ── Retry wrappers ────────────────────────────────────────────────────────────

// uploadDocumentV4Safe → v4FileService.ts (re-exported above)

export async function explainDocumentSafe(docId: string, lang?: string): Promise<ExplainResult> {
  const l = lang ?? await getLang();
  return withRetry(() => explainDocument(docId, l), { label: 'AI explain', maxAttempts: 3, delayMs: 1200 });
}

export async function getDocumentV4Safe(docId: string): Promise<V4Document> {
  return withRetry(() => getDocumentV4(docId), { label: 'getDocument', maxAttempts: 3 });
}

export async function smartSearch(
  query: string,
  { topK = 10, lang = 'de' } = {},
): Promise<SearchResult[]> {
  return withRetry(
    () => req<SearchResult[]>('POST', '/search/smart', { query, top_k: topK, lang }),
    { label: 'smartSearch', maxAttempts: 2, delayMs: 500 },
  );
}
