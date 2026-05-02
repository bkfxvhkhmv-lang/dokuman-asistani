import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import type { RadiusTokens } from '@/theme';
import type { ReminderSuggestion, ScheduledReminder } from '@/services/SmartRemindersService';

interface SmartRemindersPanelProps {
  suggestions:         ReminderSuggestion[];
  scheduled:           ScheduledReminder[];
  isScheduling:        boolean;
  onSchedule:          (s: ReminderSuggestion) => void;
  onCancel:            (notifId: string) => void;
  isAlreadyScheduled:  (id: string) => boolean;
}

function ReminderRow({ suggestion, scheduled, isScheduling, onSchedule, onCancel, C, R }: {
  suggestion:          ReminderSuggestion;
  scheduled:           ScheduledReminder | undefined;
  isScheduling:        boolean;
  onSchedule:          () => void;
  onCancel:            () => void;
  C: ThemeColors; R: RadiusTokens;
}) {
  const isSet = !!scheduled;

  const iconName = suggestion.dringend ? 'warning-octagon' : 'bell';
  const iconColor = isSet ? C.primary : (suggestion.dringend ? C.danger : C.textSecondary);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14,
      minHeight: 56, borderBottomWidth: 0.5, borderColor: C.border }}>
      <View style={{ width: 40, height: 40, borderRadius: 10,
        backgroundColor: isSet ? C.primaryLight : (suggestion.dringend ? C.dangerLight : C.bgInput),
        alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={iconName} size={22} color={iconColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{suggestion.label}</Text>
        <Text style={{ fontSize: 14, color: C.textSecondary }}>{suggestion.datumLabel}</Text>
      </View>

      {isSet ? (
        <TouchableOpacity
          onPress={onCancel}
          style={{ backgroundColor: C.bgInput, borderRadius: R.sm,
            paddingHorizontal: 12, paddingVertical: 6, minHeight: 36, justifyContent: 'center',
            borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.textSecondary }}>✓ Gesetzt</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onSchedule}
          disabled={isScheduling}
          style={{ backgroundColor: suggestion.dringend ? C.danger : C.primary, borderRadius: R.sm,
            paddingHorizontal: 12, paddingVertical: 6, minHeight: 36, justifyContent: 'center' }}>
          {isScheduling ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>+ Setzen</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SmartRemindersPanel({
  suggestions, scheduled, isScheduling, onSchedule, onCancel, isAlreadyScheduled,
}: SmartRemindersPanelProps) {
  const { Colors: C, R } = useTheme();

  if (suggestions.length === 0) return null;

  const scheduledCount = scheduled.length;

  return (
    <View style={{ backgroundColor: C.bgInput, borderRadius: R.lg, padding: 14,
      borderWidth: 0.5, borderColor: C.border, marginBottom: 12 }}>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Icon name="bell" size={16} color={C.textSecondary} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: 0.3 }}>
            Erinnerungen
          </Text>
        </View>
        {scheduledCount > 0 && (
          <View style={{ backgroundColor: C.primaryLight, borderRadius: 999,
            paddingHorizontal: 8, paddingVertical: 3,
            borderWidth: 1, borderColor: C.primary + '44' }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: C.primary }}>
              {scheduledCount} AKTIV
            </Text>
          </View>
        )}
      </View>

      {suggestions.map(s => {
        const matchingScheduled = scheduled.find(r => r.label === s.label);
        return (
          <ReminderRow
            key={s.id}
            suggestion={s}
            scheduled={matchingScheduled}
            isScheduling={isScheduling}
            onSchedule={() => onSchedule(s)}
            onCancel={() => matchingScheduled && onCancel(matchingScheduled.notifId)}
            C={C} R={R}
          />
        );
      })}

      {scheduledCount > 0 && (
        <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 8 }}>
          Erinnerungen werden auch bei geschlossener App angezeigt.
        </Text>
      )}
    </View>
  );
}
