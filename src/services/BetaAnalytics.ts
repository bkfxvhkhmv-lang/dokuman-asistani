/**
 * BetaAnalytics — privacy-safe event tracking for the 100-user beta.
 *
 * Rules enforced here:
 *  - No document content, OCR text, or personal data ever stored.
 *  - No external network calls — everything stays on device.
 *  - Only active in APP_ENV=beta (or when explicitly enabled).
 *  - Exported summary used as metadata in FeedbackModal email.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const STORAGE_KEY = '@briefpilot_beta_events_v1';
const MAX_EVENTS  = 500;

export type BetaEvent =
  | 'beta_opened'
  | 'onboarding_completed'
  | 'demo_opened'
  | 'scan_started'
  | 'scan_completed'
  | 'processing_completed'
  | 'processing_failed'
  | 'analyse_viewed'
  | 'actions_viewed'
  | 'primary_action_clicked'
  | 'document_exported'
  | 'feedback_opened'
  | 'feedback_submitted'
  | 'demo_reset';

interface EventEntry {
  event: BetaEvent;
  ts: string;
}

function isEnabled(): boolean {
  const env = Constants.expoConfig?.extra?.APP_ENV;
  return env === 'beta' || env === 'production' || __DEV__;
}

export async function trackEvent(event: BetaEvent): Promise<void> {
  if (!isEnabled()) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const entries: EventEntry[] = raw ? (JSON.parse(raw) as EventEntry[]) : [];
    entries.push({ event, ts: new Date().toISOString() });
    if (entries.length > MAX_EVENTS) entries.splice(0, entries.length - MAX_EVENTS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // analytics must never crash the app
  }
}

/** Returns a compact, privacy-safe summary string for attaching to feedback email. */
export async function getSessionSummary(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const entries: EventEntry[] = raw ? (JSON.parse(raw) as EventEntry[]) : [];

    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.event] = (counts[e.event] ?? 0) + 1;

    const first = entries[0]?.ts ?? '—';
    const last  = entries[entries.length - 1]?.ts ?? '—';
    const lines = [
      `App: BriefPilot v${Constants.expoConfig?.version ?? '?'}`,
      `OS: ${Platform.OS} ${Platform.Version}`,
      `First event: ${first.slice(0, 16)}`,
      `Last event: ${last.slice(0, 16)}`,
      `Total events: ${entries.length}`,
      '',
      ...Object.entries(counts).map(([k, v]) => `${k}: ${v}`),
    ];
    return lines.join('\n');
  } catch {
    return '';
  }
}

export async function clearEvents(): Promise<void> {
  try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
}

export const BetaAnalytics = { trackEvent, getSessionSummary, clearEvents };
