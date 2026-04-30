import { ExplainResultSchema } from '@/services/zodSchemas';
import { getAiLang } from '@/hooks/useAiLangPreference';
import type { ExplainResult } from './types';

import { req } from './client';

export async function explainDocument(docId: string, lang?: string): Promise<ExplainResult> {
  const l = lang ?? await getAiLang();
  const raw = await req('POST', `/ai/explain/${docId}`, { lang: l });
  return ExplainResultSchema.parse(raw);
}

export async function getAiLanguages(): Promise<unknown> {
  return req('GET', '/ai/languages');
}

export async function chatWithDocument(docId: string, messages: unknown[], lang?: string): Promise<unknown> {
  const l = lang ?? await getAiLang();
  return req('POST', `/ai/chat/${docId}`, { messages, lang: l });
}
