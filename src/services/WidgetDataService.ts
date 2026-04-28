/**
 * WidgetDataService
 *
 * Prepares and persists widget data so iOS WidgetKit and Android AppWidget
 * extensions can read it without the main app being open.
 *
 * Storage strategy:
 *   - Writes a JSON snapshot to FileSystem.documentDirectory/widget_data.json
 *   - On iOS (dev build): also writes to the App Group shared container via
 *     the native module exposed by the withWidget Config Plugin.
 *   - On Android: the AppWidget reads the same JSON via FileProvider.
 *
 * Called by useWidgetSync whenever the document store changes.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { getTageVerbleibend, formatBetrag } from '../utils';
import type { Dokument } from '../store';

export const WIDGET_FILE = `${FileSystem.documentDirectory}widget_data.json`;
export const APP_GROUP   = 'group.com.briefpilot.app';

// ── Data shape (read by native widget extensions) ─────────────────────────────

export interface WidgetItem {
  id:       string;
  titel:    string;
  absender: string;
  typ:      string;
  betrag:   string | null;
  daysLeft: number | null;
  risk:     string;
  emoji:    string;
}

export interface WidgetSnapshot {
  updated:     string;            // ISO
  urgentCount: number;
  totalOpen:   number;
  offenBetrag: string | null;
  topItems:    WidgetItem[];      // up to 3
  summaryLine: string;            // "Heute 2 dringende Dokumente"
  emptyState:  boolean;
}

// ── Risk → emoji mapping ──────────────────────────────────────────────────────

function riskEmoji(dok: Dokument): string {
  const tage = getTageVerbleibend(dok.frist);
  if (tage !== null && tage < 0) return '🚨';
  if (tage === 0)                return '🔴';
  if (tage !== null && tage <= 2) return '🟠';
  if (dok.risiko === 'hoch')     return '⚠️';
  return '📄';
}

// ── Build snapshot ────────────────────────────────────────────────────────────

export function buildWidgetSnapshot(docs: Dokument[]): WidgetSnapshot {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const offen = docs.filter(d => !d.erledigt);

  const urgent = offen
    .filter(d => {
      const t = getTageVerbleibend(d.frist);
      return (t !== null && t <= 3) || d.risiko === 'hoch';
    })
    .sort((a, b) => {
      const ta = getTageVerbleibend(a.frist) ?? 999;
      const tb = getTageVerbleibend(b.frist) ?? 999;
      return ta - tb;
    });

  const offenBetragNum = offen
    .filter(d => d.betrag && (d.betrag as number) > 0)
    .reduce((s, d) => s + ((d.betrag as number) || 0), 0);

  const topItems: WidgetItem[] = urgent.slice(0, 3).map(d => ({
    id:       d.id,
    titel:    d.titel.slice(0, 30),
    absender: d.absender !== 'Unbekannter Absender' ? d.absender.slice(0, 24) : d.typ,
    typ:      d.typ,
    betrag:   d.betrag ? formatBetrag(d.betrag as number) : null,
    daysLeft: getTageVerbleibend(d.frist),
    risk:     d.risiko,
    emoji:    riskEmoji(d),
  }));

  let summaryLine: string;
  if (offen.length === 0) {
    summaryLine = 'Alles erledigt ✨';
  } else if (urgent.length === 0) {
    summaryLine = `${offen.length} offene Dokumente`;
  } else if (urgent.length === 1) {
    summaryLine = `1 dringendes Dokument`;
  } else {
    summaryLine = `${urgent.length} dringende Dokumente`;
  }

  return {
    updated:     new Date().toISOString(),
    urgentCount: urgent.length,
    totalOpen:   offen.length,
    offenBetrag: offenBetragNum > 0 ? formatBetrag(offenBetragNum) : null,
    topItems,
    summaryLine,
    emptyState:  offen.length === 0,
  };
}

// ── Persist ───────────────────────────────────────────────────────────────────

export async function writeWidgetData(snapshot: WidgetSnapshot): Promise<void> {
  try {
    const json = JSON.stringify(snapshot);

    // 1. Write to documentDirectory (Android FileProvider + iOS fallback)
    await FileSystem.writeAsStringAsync(WIDGET_FILE, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // 2. iOS App Group UserDefaults — requires native module from Config Plugin.
    //    In Expo Go this is a no-op; in a dev build the module is available.
    const WidgetBridge = tryGetWidgetBridge();
    if (WidgetBridge) {
      await WidgetBridge.setString(APP_GROUP, 'briefpilot_widget', json);
      await WidgetBridge.reloadTimelines(); // triggers WidgetKit refresh
    }
  } catch (e) {
    console.warn('[Widget] writeWidgetData error', e);
  }
}

function tryGetWidgetBridge(): { setString: (group: string, key: string, value: string) => Promise<void>; reloadTimelines: () => Promise<void> } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../native/WidgetBridge').default;
  } catch {
    return null;  // Expo Go / module not yet built
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function syncWidgetData(docs: Dokument[]): Promise<void> {
  const snapshot = buildWidgetSnapshot(docs);
  await writeWidgetData(snapshot);
}
