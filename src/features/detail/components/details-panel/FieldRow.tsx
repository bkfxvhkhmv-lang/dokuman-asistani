import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import AiSparkle from '@/components/AiSparkle';
import Icon from '@/components/Icon';
import { useT } from '@/hooks/useT';

export type FieldStatus = 'pruefen' | 'fehlt' | undefined;

export function FieldRow({
  icon, label, value, isLast = false, aiSparkle = false,
  status, showEditAffordance = false, onPress,
}: {
  icon: string;
  label: string;
  value: string;
  isLast?: boolean;
  aiSparkle?: boolean;
  status?: FieldStatus;
  showEditAffordance?: boolean;
  onPress?: () => void;
}) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();

  const displayValue = status === 'fehlt' ? null : (value || null);
  const isActionable = !!onPress;

  const rowContent = (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      paddingVertical: 12, minHeight: 44,
      borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: C.border,
    }}>
      {/* Icon column */}
      <View style={{ width: 26, alignItems: 'center' }}>
        <Icon name={icon} size={20} color={C.textSecondary} />
      </View>

      {/* Label + value */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 10, color: C.textTertiary, fontWeight: '600' }}>
            {label.toUpperCase()}
          </Text>
          {aiSparkle && <AiSparkle size={8} />}
        </View>

        {displayValue ? (
          <Text
            selectable
            style={{ fontSize: 13, color: C.text, fontWeight: '600', marginTop: 2, flexShrink: 1, lineHeight: 19 }}
          >
            {displayValue}
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: C.textTertiary, fontStyle: 'italic', marginTop: 2 }}>
            {T('field.not_recognized')}
          </Text>
        )}
      </View>

      {/* Status badge — right side */}
      {status === 'pruefen' && (
        <View style={{
          paddingHorizontal: 7, paddingVertical: 2,
          borderRadius: 6, borderWidth: 0.5,
          backgroundColor: C.warningLight,
          borderColor: `${C.warning}66`,
          alignSelf: 'flex-start',
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.warning ?? C.warningText }}>
            {T('field.review')}
          </Text>
        </View>
      )}
      {status === 'fehlt' && (
        <View style={{
          paddingHorizontal: 7, paddingVertical: 2,
          borderRadius: 6, borderWidth: 0.5,
          backgroundColor: C.dangerLight,
          borderColor: `${C.danger}44`,
          alignSelf: 'flex-start',
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.danger }}>
            {T('field.missing')}
          </Text>
        </View>
      )}

      {/* Edit affordance — only shown when row is actually tappable */}
      {isActionable && (
        <View style={{ paddingTop: 2 }}>
          <Icon name="pencil-simple" size={14} color={C.textTertiary} />
        </View>
      )}
    </View>
  );

  if (isActionable) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
        {rowContent}
      </TouchableOpacity>
    );
  }
  return rowContent;
}
