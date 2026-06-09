/** Proaktif bildirim metinleri + expo-notifications köprüsü */

export {
  DAILY_DIGEST_IDENTIFIER,
  ANDROID_DEFAULT_NOTIFICATION_CHANNEL_ID,
} from './constants';

export { buildUploadNotificationContent } from './notifyContent';
export { buildDailyDigestContent } from './dailyDigest';

export {
  ensureAndroidDefaultNotificationChannel,
  setupNotificationCategories,
  requestNotificationPermission,
  withAndroidNotificationChannel,
  notifyAfterUpload,
  scheduleDailyDigest,
  cancelDailyDigest,
} from './scheduling';

export type { NotificationPayload } from './payload';
export { parseNotificationData } from './payload';
