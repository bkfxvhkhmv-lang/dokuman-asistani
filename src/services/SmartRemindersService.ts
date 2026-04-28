/**
 * Smart Reminders — V12 Sprint 4
 *
 * Intelligent reminder suggestions:
 * - Auto-suggests optimal reminder times per doc type
 * - Risk-adjusted scheduling (high risk = sooner reminder)
 * - Template-based recurring reminders (passport, TÜV, etc.)
 * - Integrates with expo-notifications
 * - Offline-first: all scheduling is local
 */

import type { Dokument } from '../store';
import { getTageVerbleibend, HATIRLATICI_SABLONLARI, type HatirlaticiSablon } from '../utils';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReminderSuggestion {
  id:             string;
  label:          string;
  beschreibung:   string;
  datum:          Date;
  datumLabel:     string;
  tageVorher?:    number;
  dringend:       boolean;
  icon:           string;
  typ:            'deadline' | 'einspruch' | 'template' | 'custom';
  notifTitle:     string;
  notifBody:      string;
}

export interface ScheduledReminder {
  notifId:    string;
  dokumentId: string;
  datum:      string;
  label:      string;
}

// ── Optimal reminder times per doc type ───────────────────────────────────────

const TYP_REMINDER_TAGE: Record<string, number[]> = {
  Mahnung:         [1, 2],
  Bußgeld:         [1, 3],
  Steuerbescheid:  [3, 7, 14],
  Behördenbescheid:[3, 7],
  Rechnung:        [3, 5],
  Versicherung:    [7, 14],
  Vertrag:         [7, 30],
  Termin:          [1, 2],
  Kündigung:       [3, 7],
  Sonstiges:       [3, 7],
};

// ── Suggestion builder ─────────────────────────────────────────────────────────

export function buildReminderSuggestions(dok: Dokument): ReminderSuggestion[] {
  const suggestions: ReminderSuggestion[] = [];
  const tage = getTageVerbleibend(dok.frist);
  const now = new Date();

  // Deadline reminders
  if (dok.frist && !dok.erledigt) {
    const fristDate = new Date(dok.frist);
    const basisTage = TYP_REMINDER_TAGE[dok.typ] || [3, 7];

    for (const t of basisTage) {
      if (tage === null || tage > t) {
        const datum = new Date(fristDate);
        datum.setDate(datum.getDate() - t);
        datum.setHours(9, 0, 0, 0);
        if (datum > now) {
          suggestions.push({
            id:           `deadline_${dok.id}_${t}`,
            label:        t === 1 ? '1 Tag vor Frist' : `${t} Tage vor Frist`,
            beschreibung: `Erinnerung am ${datum.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}`,
            datum,
            datumLabel:   datum.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            tageVorher:   t,
            dringend:     t <= 2,
            icon:         t <= 2 ? '🔴' : '🟡',
            typ:          'deadline',
            notifTitle:   `${t === 1 ? '🔴 Morgen fällig' : `⏰ ${t} Tage bis Frist`}: ${dok.titel}`,
            notifBody:    `${dok.absender} — ${dok.betrag ? `${(dok.betrag as number).toFixed(2)} €` : dok.typ}`,
          });
        }
      }
    }
  }

  // Einspruchsfrist reminders
  if (['Bußgeld', 'Steuerbescheid', 'Behördenbescheid'].includes(dok.typ) && !dok.erledigt) {
    const days = dok.typ === 'Bußgeld' ? 14 : 30;
    const einspruchDate = new Date(dok.datum || now);
    einspruchDate.setDate(einspruchDate.getDate() + days - 3);
    einspruchDate.setHours(9, 0, 0, 0);
    if (einspruchDate > now) {
      suggestions.push({
        id:           `einspruch_${dok.id}`,
        label:        `Einspruchsfrist (${days} Tage)`,
        beschreibung: `3 Tage vor Ende der Einspruchsfrist`,
        datum:        einspruchDate,
        datumLabel:   einspruchDate.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }),
        tageVorher:   3,
        dringend:     false,
        icon:         '✍️',
        typ:          'einspruch',
        notifTitle:   `⚠️ Einspruchsfrist endet bald: ${dok.titel}`,
        notifBody:    `Nur noch 3 Tage — jetzt Einspruch prüfen`,
      });
    }
  }

  // High-risk override — sofort reminder
  if (dok.risiko === 'hoch' && tage !== null && tage <= 7 && tage > 0) {
    const morgen = new Date(now);
    morgen.setDate(morgen.getDate() + 1);
    morgen.setHours(9, 0, 0, 0);
    const alreadyHasSofort = suggestions.some(s => s.tageVorher === 1);
    if (!alreadyHasSofort) {
      suggestions.push({
        id:           `sofort_${dok.id}`,
        label:        'Sofort-Erinnerung (Hochrisiko)',
        beschreibung: 'Morgen früh — wegen hohem Risiko',
        datum:        morgen,
        datumLabel:   'Morgen, 09:00',
        tageVorher:   1,
        dringend:     true,
        icon:         '🚨',
        typ:          'deadline',
        notifTitle:   `🚨 Dringendes Dokument: ${dok.titel}`,
        notifBody:    `Risiko: Hoch — bitte sofort handeln`,
      });
    }
  }

  return suggestions.sort((a, b) => a.datum.getTime() - b.datum.getTime());
}

// ── Schedule a reminder ────────────────────────────────────────────────────────

export async function scheduleReminder(
  dok: Dokument,
  suggestion: ReminderSuggestion,
): Promise<ScheduledReminder | null> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    if (suggestion.datum <= new Date()) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: suggestion.notifTitle,
        body:  suggestion.notifBody,
        data:  { dokId: dok.id, reminderId: suggestion.id, type: 'smart_reminder' },
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: suggestion.datum },
    });
    return { notifId: id, dokumentId: dok.id, datum: suggestion.datum.toISOString(), label: suggestion.label };
  } catch { return null; }
}

// ── Template reminders ────────────────────────────────────────────────────────

export function getTemplateSuggestions(): HatirlaticiSablon[] {
  return HATIRLATICI_SABLONLARI;
}

export async function scheduleTemplateReminder(
  dok: Dokument,
  sablon: HatirlaticiSablon,
): Promise<ScheduledReminder | null> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    const datum = new Date();
    datum.setMonth(datum.getMonth() + sablon.aySayisi);
    datum.setHours(9, 0, 0, 0);
    if (datum <= new Date()) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${sablon.icon} ${sablon.label} — Erinnerung`,
        body:  `${dok.titel}: ${sablon.hinweis}`,
        data:  { dokId: dok.id, sablonId: sablon.id, type: 'template_reminder' },
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: datum },
    });
    return { notifId: id, dokumentId: dok.id, datum: datum.toISOString(), label: sablon.label };
  } catch { return null; }
}

// ── Cancel a reminder ────────────────────────────────────────────────────────

export async function cancelReminder(notifId: string): Promise<void> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(notifId);
  } catch {}
}

// ── Get all pending reminders for a doc ───────────────────────────────────────

export async function getPendingRemindersForDoc(dokId: string): Promise<string[]> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all
      .filter(n => (n.content.data as any)?.dokId === dokId)
      .map(n => n.identifier);
  } catch { return []; }
}
