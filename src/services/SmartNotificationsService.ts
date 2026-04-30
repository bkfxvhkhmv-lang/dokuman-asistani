/**
 * Smart Notifications — `./smart-notifications/` altında; geriye dönük import yolu.
 */
export type { NotificationPayload } from '@/services/smart-notifications';
export {
  ANDROID_DEFAULT_NOTIFICATION_CHANNEL_ID,
  DAILY_DIGEST_IDENTIFIER,
  buildUploadNotificationContent,
  buildDailyDigestContent,
  ensureAndroidDefaultNotificationChannel,
  setupNotificationCategories,
  requestNotificationPermission,
  withAndroidNotificationChannel,
  notifyAfterUpload,
  scheduleDailyDigest,
  cancelDailyDigest,
  parseNotificationData,
} from '@/services/smart-notifications';
