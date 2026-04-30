import { Platform } from 'react-native';

import type { Dokument } from '@/store';

import { buildUploadNotificationContent } from './notifyContent';
import {
  ANDROID_DEFAULT_NOTIFICATION_CHANNEL_ID,
  DAILY_DIGEST_IDENTIFIER,
} from './constants';
import { buildDailyDigestContent } from './dailyDigest';

/** Android’da kanal yoksa Expo uyarı toast’ı gösteriyor; FCM için app.json plugin ile aynı ID. */
export async function ensureAndroidDefaultNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const { default: Notifications } = await import('expo-notifications');
    await Notifications.setNotificationChannelAsync(
      ANDROID_DEFAULT_NOTIFICATION_CHANNEL_ID,
      {
        name: 'BriefPilot',
        importance: Notifications.AndroidImportance.DEFAULT,
      },
    );
  } catch (e) {
    console.warn('[SmartNotif] ensureAndroidDefaultNotificationChannel', e);
  }
}

/** Yerel bildirim JSON’una Android’de `channelId` ekler (kanal zaten `ensure…` ile oluşturulmalı). */
export function withAndroidNotificationChannel<T extends Record<string, unknown>>(
  content: T,
): T & { channelId?: string } {
  if (Platform.OS !== 'android') return content;
  return { ...content, channelId: ANDROID_DEFAULT_NOTIFICATION_CHANNEL_ID };
}

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
      await ensureAndroidDefaultNotificationChannel();
      await setupNotificationCategories();
      return true;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      await ensureAndroidDefaultNotificationChannel();
      await setupNotificationCategories();
    }
    return status === 'granted';
  } catch { return false; }
}

export async function notifyAfterUpload(
  dok: Dokument,
  alleDocs: Dokument[],
): Promise<void> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    await ensureAndroidDefaultNotificationChannel();
    const content = buildUploadNotificationContent(dok, alleDocs);

    const isInvoiceLike = ['Rechnung', 'Mahnung'].includes(dok.typ) && dok.betrag;
    const isHighRisk = dok.risiko === 'hoch' || ['Bußgeld', 'Kündigung', 'Steuerbescheid'].includes(dok.typ);
    const categoryIdentifier = isInvoiceLike ? 'invoice' : isHighRisk ? 'risk' : undefined;

    const base = {
      ...content,
      categoryIdentifier,
      data: { dokId: dok.id, type: 'upload' },
    };

    await Notifications.scheduleNotificationAsync({
      content: withAndroidNotificationChannel(base),
      trigger: null,
    });
  } catch (e) { console.warn('[SmartNotif] notifyAfterUpload error', e); }
}

export async function scheduleDailyDigest(docs: Dokument[]): Promise<void> {
  try {
    const { default: Notifications, SchedulableTriggerInputTypes } = await import('expo-notifications');
    const content = buildDailyDigestContent(docs);

    await Notifications.cancelScheduledNotificationAsync(DAILY_DIGEST_IDENTIFIER).catch(() => {});

    if (!content) return;

    await ensureAndroidDefaultNotificationChannel();

    const trigger = new Date();
    trigger.setDate(trigger.getDate() + (trigger.getHours() >= 8 ? 1 : 0));
    trigger.setHours(8, 0, 0, 0);

    const digestBase = { ...content, data: { type: 'daily_digest' } };

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_DIGEST_IDENTIFIER,
      content: withAndroidNotificationChannel(digestBase),
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: trigger },
    });
  } catch (e) { console.warn('[SmartNotif] scheduleDailyDigest error', e); }
}

export async function cancelDailyDigest(): Promise<void> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(DAILY_DIGEST_IDENTIFIER);
  } catch { /* noop */ }
}
