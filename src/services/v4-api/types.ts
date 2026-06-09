export type { ExplainResult } from '@/services/zodSchemas';
export type { DeltaSyncResult } from '@/services/zodSchemas';

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

export interface EventReplayResult {
  events: unknown[];
  last_event_id?: number;
}

export interface TimelineResponse {
  events?: Record<string, unknown>[];
  [key: string]: unknown;
}
