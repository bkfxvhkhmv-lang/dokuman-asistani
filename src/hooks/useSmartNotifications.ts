import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useStore } from '../store';
import {
  requestNotificationPermission,
  notifyAfterUpload,
  scheduleDailyDigest,
  parseNotificationData,
} from '../services/SmartNotificationsService';

// Wires smart notifications to the store.
// - Requests permission + sets up notification categories once on mount
// - Fires upload notification when a new document appears
// - Reschedules daily digest when the portfolio changes
// - Deep-links and handles Quick Actions when user taps a notification

export function useSmartNotifications() {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const prevDocCountRef = useRef<number>(0);
  const permissionGrantedRef = useRef(false);
  const responseListenerRef = useRef<{ remove: () => void } | null>(null);

  // Permission + notification categories on mount
  useEffect(() => {
    requestNotificationPermission().then(granted => {
      permissionGrantedRef.current = granted;
    });
  }, []);

  // Notification tap + Quick Action handler
  useEffect(() => {
    let sub: { remove: () => void } | null = null;

    import('expo-notifications').then(({ default: Notifications }) => {
      sub = Notifications.addNotificationResponseReceivedListener(response => {
        const { actionIdentifier, notification } = response;
        const data = parseNotificationData(notification.request.content.data as Record<string, unknown>);

        switch (actionIdentifier) {
          case 'open':
          case Notifications.DEFAULT_ACTION_IDENTIFIER:
            if (data?.dokId) {
              router.push({ pathname: '/detail', params: { dokId: data.dokId } });
            } else {
              router.push('/(tabs)');
            }
            break;

          case 'mark_paid':
            if (data?.dokId) {
              dispatch({ type: 'MARK_ERLEDIGT', id: data.dokId });
            }
            break;

          case 'remind_3d':
            if (data?.dokId) {
              // Re-schedule a reminder 3 days from now at 09:00
              import('expo-notifications').then(({ default: N, SchedulableTriggerInputTypes }) => {
                const in3Days = new Date();
                in3Days.setDate(in3Days.getDate() + 3);
                in3Days.setHours(9, 0, 0, 0);
                const originalContent = notification.request.content;
                N.scheduleNotificationAsync({
                  content: {
                    title: `⏰ ${originalContent.title ?? ''}`,
                    body: originalContent.body ?? '',
                    data: { dokId: data?.dokId, type: 'upload' },
                  },
                  trigger: { type: SchedulableTriggerInputTypes.DATE, date: in3Days },
                }).catch(() => {});
              });
            }
            break;

          case 'dismiss':
          default:
            // No action needed
            break;
        }
      });
      responseListenerRef.current = sub;
    }).catch(() => {});

    return () => { sub?.remove(); };
  }, [router, dispatch]);

  // New document → upload notification
  useEffect(() => {
    const docs = state.dokumente;
    const prev = prevDocCountRef.current;

    if (prev > 0 && docs.length > prev && permissionGrantedRef.current) {
      const newestDoc = docs[0];
      if (newestDoc) {
        notifyAfterUpload(newestDoc, docs);
      }
    }

    prevDocCountRef.current = docs.length;
  }, [state.dokumente.length]);

  // Reschedule daily digest whenever portfolio changes
  useEffect(() => {
    if (!permissionGrantedRef.current) return;
    scheduleDailyDigest(state.dokumente);
  }, [state.dokumente]);
}
