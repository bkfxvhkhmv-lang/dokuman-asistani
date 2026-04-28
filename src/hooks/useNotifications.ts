import { useCallback } from 'react';
import {
  scheduleDeadlineNotification,
  cancelNotification,
  registerForPushNotificationsAsync,
} from '../services/notifications';

export function useNotifications() {
  const register = useCallback(async (): Promise<string | null> => {
    try {
      return (await registerForPushNotificationsAsync()) as unknown as string | null;
    } catch {
      return null;
    }
  }, []);

  const scheduleDeadline = useCallback(async (dokument: any): Promise<string | null> => {
    try {
      await scheduleDeadlineNotification(dokument);
      return null;
    } catch {
      return null;
    }
  }, []);

  const cancel = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await cancelNotification(notificationId);
    } catch { /* silent */ }
  }, []);

  return { register, scheduleDeadline, cancel };
}
