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
    if (!dok) return;
    setIsScheduling(true);
    try {
      const permissions = await Notifications.getPermissionsAsync();
      let finalStatus = permissions.status;

      if (permissions.status !== 'granted') {
        if (!permissions.canAskAgain) {
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
        const requestResult = await Notifications.requestPermissionsAsync();
        finalStatus = requestResult.status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Benachrichtigungen deaktiviert',
          'Aktiviere Benachrichtigungen, damit BriefPilot dich an Fristen erinnern kann.',
        );
        return;
      }

      const result = await scheduleReminder(dok, suggestion);
      if (result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScheduled(prev => [...prev, result]);
      }
    } catch {
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
