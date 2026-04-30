import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SummaryMode, SummaryResult } from './types';

const CACHE_PREFIX = '@bp_v12_summary_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function getCachedSummary(dokId: string, mode: SummaryMode): Promise<SummaryResult | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${dokId}_${mode}`);
    if (!raw) return null;
    const { result, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return { ...result, quelle: 'ki_cache' };
  } catch {
    return null;
  }
}

export async function cacheSummary(dokId: string, mode: SummaryMode, result: SummaryResult): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${dokId}_${mode}`, JSON.stringify({ result, ts: Date.now() }));
  } catch (e) {
    console.warn('[SmartSummaryService] cacheSummary error', e);
  }
}
