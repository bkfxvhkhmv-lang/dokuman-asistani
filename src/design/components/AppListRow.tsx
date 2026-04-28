import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../ThemeContext';
import Icon from '../../components/Icon';

interface AppListRowProps {
  icon?: string;
  iconColor?: string;
  label: string;
  sublabel?: string;
  accessory?: 'chevron' | 'badge' | React.ReactNode;
  badgeText?: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  noBorder?: boolean;
  style?: ViewStyle;
}

export default function AppListRow({
  icon,
  iconColor,
  label,
  sublabel,
  accessory,
  badgeText,
  onPress,
  danger = false,
  disabled = false,
  noBorder = false,
  style,
}: AppListRowProps) {
  const { Colors } = useTheme();

  const iconBg = iconColor ?? Colors.primary;
  const labelColor = danger ? Colors.danger : Colors.text;

  const content = (
    <View style={[st.row, !noBorder && { borderBottomWidth: 0.5, borderBottomColor: Colors.border }, style]}>
      {icon ? (
        <View style={[st.iconBadge, { backgroundColor: iconBg + '1A' }]}>
          <Icon name={icon} size={16} color={iconBg} />
        </View>
      ) : null}

      <View style={st.textBlock}>
        <Text style={[st.label, { color: labelColor }, disabled && st.disabled]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[st.sublabel, { color: Colors.textTertiary }]} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>

      {accessory === 'chevron' ? (
        <Icon name="chevron-forward" size={16} color={Colors.textTertiary} />
      ) : accessory === 'badge' && badgeText ? (
        <View style={[st.badge, { backgroundColor: Colors.primaryLight }]}>
          <Text style={[st.badgeText, { color: Colors.primaryDark }]}>{badgeText}</Text>
        </View>
      ) : React.isValidElement(accessory) ? (
        accessory
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        activeOpacity={0.75}
        style={{ opacity: disabled ? 0.45 : 1 }}
        accessibilityRole="button"
        accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
        accessibilityState={{ disabled }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={{ opacity: disabled ? 0.45 : 1 }}>{content}</View>;
}

const st = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  iconBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textBlock: { flex: 1, gap: 2 },
  label:     { fontSize: 14, fontWeight: '500' },
  sublabel:  { fontSize: 12 },
  disabled:  { opacity: 0.5 },
  badge:     { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
