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
    if (!dok) return;
    setIsScheduling(true);
    try {
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
