import type { Dokument } from '../store';

export async function registerForPushNotificationsAsync(): Promise<null> {
  console.log('Push notifications disabled in Expo Go');
  return null;
}

export async function scheduleDeadlineNotification(_dokument: Dokument): Promise<void> {
  console.log('Notifications disabled in Expo Go');
}

export async function cancelNotification(_notificationId: string): Promise<void> {
  console.log('Notifications disabled in Expo Go');
}

export default {
  registerForPushNotificationsAsync,
  scheduleDeadlineNotification,
  cancelNotification,
};
