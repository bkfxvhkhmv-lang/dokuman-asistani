import { withRetry } from '@/services/retryHelper';
import { getAiLang } from '@/hooks/useAiLangPreference';
import type { ExplainResult } from './types';

import { explainDocument } from './ai';
import { getDocumentV4 } from './documents';
import { req } from './client';
import type { SearchResult } from './types';

export async function explainDocumentSafe(docId: string, lang?: string): Promise<ExplainResult> {
  const l = lang ?? await getAiLang();
  return withRetry(() => explainDocument(docId, l), { label: 'AI explain', maxAttempts: 3, delayMs: 1200 });
}

export async function getDocumentV4Safe(docId: string) {
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
