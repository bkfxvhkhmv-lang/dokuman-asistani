/**
 * Smart Notifications — Proactive assistant notifications
 *
 * Content philosophy: never report what happened ("document uploaded"),
 * always report what it means ("Stadtwerke bill: €89 — 5 days left").
 *
 * Three notification types:
 * 1. Post-upload — fires immediately after OCR, value-first content
 * 2. Daily digest — 08:00 morning briefing with the day's critical items
 * 3. Anomaly alert — when a new bill is significantly higher than past ones
 */

import type { Dokument } from '../store';
import { getTageVerbleibend, formatBetrag } from '../utils';

export const DAILY_DIGEST_IDENTIFIER = 'briefpilot_daily_digest';

// ── Content builders ──────────────────────────────────────────────────────────

function betragStr(dok: Dokument): string | null {
  return dok.betrag ? formatBetrag(dok.betrag as number) : null;
}

function detectAmountAnomaly(dok: Dokument, alleDocs: Dokument[]): number | null {
  if (!dok.betrag || (dok.betrag as number) <= 0) return null;
  const similar = alleDocs.filter(
    d => d.id !== dok.id && d.typ === dok.typ && d.absender === dok.absender && d.betrag && (d.betrag as number) > 0
  );
  if (similar.length < 2) return null;
  const avg = similar.reduce((s, d) => s + (d.betrag as number), 0) / similar.length;
  const diff = ((dok.betrag as number) - avg) / avg;
  return Math.abs(diff) >= 0.15 ? diff : null;  // ≥ 15% deviation
}

export function buildUploadNotificationContent(
  dok: Dokument,
  alleDocs: Dokument[],
): { title: string; body: string } {
  const tage = getTageVerbleibend(dok.frist);
  const betrag = betragStr(dok);
  const absender = dok.absender !== 'Unbekannter Absender' ? dok.absender : dok.typ;
  const anomaly = detectAmountAnomaly(dok, alleDocs);

  // Anomaly takes priority — it's the most surprising insight
  if (anomaly !== null) {
    const pct = Math.round(Math.abs(anomaly) * 100);
    const direction = anomaly > 0 ? 'höher' : 'niedriger';
    return {
      title: `${absender}: ${pct}% ${direction} als üblich`,
      body: betrag
        ? `${betrag}${tage !== null && tage >= 0 ? ` — fällig in ${tage} Tag${tage !== 1 ? 'en' : ''}` : ' — bereits überfällig'}`
        : `Bitte prüfen`,
    };
  }

  // Overdue
  if (tage !== null && tage < 0) {
    return {
      title: `🚨 Überfällig: ${absender}`,
      body: betrag ? `${betrag} — Frist ist abgelaufen` : `Sofort handeln`,
    };
  }

  // Due today
  if (tage === 0) {
    return {
      title: `🔴 Heute fällig: ${absender}`,
      body: betrag ? `${betrag} — letzter Tag` : `Frist endet heute`,
    };
  }

  // Due soon (≤ 7 days)
  if (tage !== null && tage <= 7) {
    return {
      title: `⏰ ${absender}: noch ${tage} Tag${tage !== 1 ? 'e' : ''}`,
      body: betrag ? `${betrag} — ${dok.risiko === 'hoch' ? 'dringend handeln' : 'im Blick behalten'}` : dok.typ,
    };
  }

  // High-risk doc type without tight deadline
  if (['Mahnung', 'Bußgeld', 'Kündigung'].includes(dok.typ)) {
    return {
      title: `⚠️ ${dok.typ} von ${absender}`,
      body: betrag ? `${betrag}${tage !== null ? ` — Frist in ${tage} Tagen` : ''}` : `Jetzt prüfen`,
    };
  }

  // Standard informational
  return {
    title: `${absender}: ${dok.typ} erkannt`,
    body: [betrag, tage !== null && tage >= 0 ? `Frist in ${tage} Tagen` : null, dok.zusammenfassung?.slice(0, 60)]
      .filter(Boolean).join(' — ') || dok.titel,
  };
}

export function buildDailyDigestContent(
  docs: Dokument[],
): { title: string; body: string } | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const offen = docs.filter(d => !d.erledigt);
  if (offen.length === 0) return null;

  const überfällig = offen.filter(d => d.frist && new Date(d.frist) < today);
  const heuteUndMorgen = offen.filter(d => {
    const t = getTageVerbleibend(d.frist);
    return t !== null && t >= 0 && t <= 1;
  });
  const dieseWoche = offen.filter(d => {
    const t = getTageVerbleibend(d.frist);
    return t !== null && t > 1 && t <= 7;
  });
  const hochRisiko = offen.filter(d => d.risiko === 'hoch' && !d.frist);

  // Nothing urgent today
  if (überfällig.length === 0 && heuteUndMorgen.length === 0 && dieseWoche.length === 0 && hochRisiko.length === 0) {
    return null;
  }

  const parts: string[] = [];
  if (überfällig.length > 0)
    parts.push(`${überfällig.length} überfällig${überfällig.length > 1 ? 'e' : 'es'}`);
  if (heuteUndMorgen.length > 0)
    parts.push(`${heuteUndMorgen.length} heute/morgen fällig`);
  if (dieseWoche.length > 0)
    parts.push(`${dieseWoche.length} diese Woche`);

  const urgentDoc = überfällig[0] ?? heuteUndMorgen[0] ?? dieseWoche[0];
  const totalUrgent = überfällig.length + heuteUndMorgen.length;

  const title = totalUrgent > 0
    ? `Guten Morgen — ${totalUrgent} dringende${totalUrgent > 1 ? '' : 's'} Dokument${totalUrgent > 1 ? 'e' : ''}`
    : `Guten Morgen — ${dieseWoche.length} Frist${dieseWoche.length > 1 ? 'en' : ''} diese Woche`;

  const body = [
    parts.join(', '),
    urgentDoc ? `Dringendster: ${urgentDoc.absender !== 'Unbekannter Absender' ? urgentDoc.absender : urgentDoc.typ}${urgentDoc.betrag ? ` (${formatBetrag(urgentDoc.betrag as number)})` : ''}` : null,
  ].filter(Boolean).join('\n');

  return { title, body };
}

// ── Scheduler ────────────────────────────────────────────────────────────────

// ── Notification categories (Interactive Quick Actions) ───────────────────────

export async function setupNotificationCategories(): Promise<void> {
  try {
    const { default: Notifications } = await import('expo-notifications');

    await Notifications.setNotificationCategoryAsync('invoice', [
      { identifier: 'mark_paid',  buttonTitle: 'Als bezahlt markieren', options: { opensAppToForeground: false } },
      { identifier: 'remind_3d', buttonTitle: 'In 3 Tagen erinnern',   options: { opensAppToForeground: false } },
      { identifier: 'open',       buttonTitle: 'Öffnen',                 options: { opensAppToForeground: true  } },
    ]);

    await Notifications.setNotificationCategoryAsync('risk', [
      { identifier: 'open',    buttonTitle: 'Jetzt ansehen',  options: { opensAppToForeground: true  } },
      { identifier: 'dismiss', buttonTitle: 'Zurückstellen', options: { opensAppToForeground: false } },
    ]);

    await Notifications.setNotificationCategoryAsync('digest', [
      { identifier: 'open', buttonTitle: 'Alle anzeigen', options: { opensAppToForeground: true } },
    ]);
  } catch (e) { console.warn('[SmartNotif] setupNotificationCategories error', e); }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') {
      await setupNotificationCategories();
      return true;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') await setupNotificationCategories();
    return status === 'granted';
  } catch { return false; }
}

export async function notifyAfterUpload(
  dok: Dokument,
  alleDocs: Dokument[],
): Promise<void> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    const content = buildUploadNotificationContent(dok, alleDocs);

    const isInvoiceLike = ['Rechnung', 'Mahnung'].includes(dok.typ) && dok.betrag;
    const isHighRisk = dok.risiko === 'hoch' || ['Bußgeld', 'Kündigung', 'Steuerbescheid'].includes(dok.typ);
    const categoryIdentifier = isInvoiceLike ? 'invoice' : isHighRisk ? 'risk' : undefined;

    await Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        categoryIdentifier,
        data: { dokId: dok.id, type: 'upload' },
      },
      trigger: null,  // immediate
    });
  } catch (e) { console.warn('[SmartNotif] notifyAfterUpload error', e); }
}

export async function scheduleDailyDigest(docs: Dokument[]): Promise<void> {
  try {
    const { default: Notifications, SchedulableTriggerInputTypes } = await import('expo-notifications');
    const content = buildDailyDigestContent(docs);

    // Always cancel previous digest first
    await Notifications.cancelScheduledNotificationAsync(DAILY_DIGEST_IDENTIFIER).catch(() => {});

    if (!content) return;  // Nothing urgent — no need to wake the user

    const trigger = new Date();
    trigger.setDate(trigger.getDate() + (trigger.getHours() >= 8 ? 1 : 0));
    trigger.setHours(8, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_DIGEST_IDENTIFIER,
      content: { ...content, data: { type: 'daily_digest' } },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: trigger },
    });
  } catch (e) { console.warn('[SmartNotif] scheduleDailyDigest error', e); }
}

export async function cancelDailyDigest(): Promise<void> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(DAILY_DIGEST_IDENTIFIER);
  } catch {}
}

// ── Notification tap handler ─────────────────────────────────────────────────

export interface NotificationPayload {
  type: 'upload' | 'daily_digest' | 'smart_reminder' | 'template_reminder';
  dokId?: string;
}

export function parseNotificationData(data: Record<string, unknown>): NotificationPayload | null {
  if (!data?.type) return null;
  return data as unknown as NotificationPayload;
}
