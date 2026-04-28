import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../ThemeContext';
import Icon from '../../components/Icon';

interface RightAction {
  icon: string;
  onPress: () => void;
  active?: boolean;
  badge?: boolean;
}

interface AppBarProps {
  title?: string;
  subtitle?: string;
  leftIcon?: string;
  leftPress?: () => void;
  rightActions?: RightAction[];
  backgroundColor?: string;
  borderBottom?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export default function AppBar({
  title,
  subtitle,
  leftIcon,
  leftPress,
  rightActions = [],
  backgroundColor,
  borderBottom = true,
  children,
  style,
}: AppBarProps) {
  const { Colors } = useTheme();
  const bg = backgroundColor ?? Colors.bgCard;

  return (
    <View style={[
      st.bar,
      { backgroundColor: bg },
      borderBottom && { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
      style,
    ]}>
      <View style={st.slot}>
        {leftIcon && leftPress ? (
          <TouchableOpacity onPress={leftPress} style={st.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name={leftIcon} size={22} color={Colors.text} />
          </TouchableOpacity>
        ) : leftIcon ? (
          <Icon name={leftIcon} size={22} color={Colors.primary} />
        ) : null}
      </View>

      <View style={st.center}>
        {children ?? (
          <>
            {title ? <Text style={[st.title, { color: Colors.text }]} numberOfLines={1}>{title}</Text> : null}
            {subtitle ? <Text style={[st.subtitle, { color: Colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text> : null}
          </>
        )}
      </View>

      <View style={[st.slot, st.rightSlot]}>
        {rightActions.map((action, i) => (
          <TouchableOpacity
            key={i}
            onPress={action.onPress}
            style={[st.iconBtn, action.active && { backgroundColor: Colors.primaryLight }]}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            activeOpacity={0.75}
          >
            <Icon name={action.icon} size={21} color={action.active ? Colors.primary : Colors.text} />
            {action.badge ? <View style={[st.badge, { backgroundColor: Colors.primary }]} /> : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar:        { flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 8 },
  slot:       { width: 80, flexDirection: 'row', alignItems: 'center' },
  rightSlot:  { justifyContent: 'flex-end', gap: 4 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  subtitle:   { fontSize: 11, marginTop: 1 },
  iconBtn:    { padding: 6, borderRadius: 10, position: 'relative' },
  badge:      { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4 },
});
