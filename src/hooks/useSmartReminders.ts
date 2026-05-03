import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  buildReminderSuggestions,
  scheduleReminder,
  cancelReminder,
  type ReminderSuggestion,
  type ScheduledReminder,
} from '@/services/SmartRemindersService';
import type { Dokument } from '@/store';

export function useSmartReminders(dok: Dokument | null) {
  const [scheduled, setScheduled] = useState<ScheduledReminder[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);

  const suggestions = useMemo(() => (dok ? buildReminderSuggestions(dok) : []), [dok]);

  const schedule = useCallback(async (suggestion: ReminderSuggestion) => {
    console.warn('[ReminderTrace] useSmartReminders.schedule entered', suggestion?.id);
    if (!dok) return;
    setIsScheduling(true);
    try {
      console.warn('[ReminderTrace] before getPermissionsAsync');
      const { default: Notifications } = await import('expo-notifications');

      const permissions = await Notifications.getPermissionsAsync();
      if (__DEV__) console.log('[ReminderTrace] permission before', permissions);

      let finalStatus = permissions.status;
      if (permissions.status !== 'granted') {
        if (__DEV__) console.log('[ReminderTrace] requesting permission');
        const requestResult = await Notifications.requestPermissionsAsync();
        if (__DEV__) console.log('[ReminderTrace] permission after', requestResult);
        finalStatus = requestResult.status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Benachrichtigungen deaktiviert',
          'Aktiviere Benachrichtigungen, damit BriefPilot dich an Fristen erinnern kann.',
        );
        return;
      }

      if (__DEV__) console.log('[ReminderTrace] scheduling notification');
      const result = await scheduleReminder(dok, suggestion);
      if (result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScheduled(prev => [...prev, result]);
      }
    } catch (error) {
      if (__DEV__) console.warn('[ReminderTrace] schedule failed original error', error);
      Alert.alert(
        'Erinnerung nicht gesetzt',
        'Bitte prüfe die Benachrichtigungsberechtigung und versuche es erneut.',
      );
    } finally {
      setIsScheduling(false);
    }
  }, [dok]);

  const cancel = useCallback(async (notifId: string) => {
    await cancelReminder(notifId);
    setScheduled(prev => prev.filter(r => r.notifId !== notifId));
  }, []);

  const isAlreadyScheduled = useCallback((suggestionId: string) => {
    return scheduled.some(r => r.label.includes(suggestionId));
  }, [scheduled]);

  return { suggestions, scheduled, isScheduling, schedule, cancel, isAlreadyScheduled };
}
