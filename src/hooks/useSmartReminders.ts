import { useState, useMemo, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
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
      const permissions = await Notifications.getPermissionsAsync();
      console.warn('[ReminderTrace] permission before', permissions.status, 'canAskAgain:', permissions.canAskAgain);

      let finalStatus = permissions.status;

      if (permissions.status !== 'granted') {
        if (!permissions.canAskAgain) {
          // User previously denied — guide to Settings
          console.warn('[ReminderTrace] canAskAgain false, opening settings');
          Alert.alert(
            'Benachrichtigungen deaktiviert',
            'Öffne die Einstellungen und aktiviere Benachrichtigungen für BriefPilot.',
            [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Einstellungen öffnen', onPress: () => Linking.openURL('app-settings:') },
            ],
          );
          return;
        }
        console.warn('[ReminderTrace] requesting permission');
        const requestResult = await Notifications.requestPermissionsAsync();
        console.warn('[ReminderTrace] permission after', requestResult.status);
        finalStatus = requestResult.status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Benachrichtigungen deaktiviert',
          'Aktiviere Benachrichtigungen, damit BriefPilot dich an Fristen erinnern kann.',
        );
        return;
      }

      console.warn('[ReminderTrace] scheduling notification');
      const result = await scheduleReminder(dok, suggestion);
      if (result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScheduled(prev => [...prev, result]);
      }
    } catch (error) {
      console.warn('[ReminderTrace] schedule failed', error);
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
