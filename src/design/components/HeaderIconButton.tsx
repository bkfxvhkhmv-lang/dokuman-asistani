import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';

interface Props {
  name: string;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  style?: ViewStyle;
}

const HIT = { top: 12, bottom: 12, left: 12, right: 12 };

export default function HeaderIconButton({
  name,
  onPress,
  accessibilityLabel,
  color,
  size = 22,
  style,
}: Props) {
  const { Colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={HIT}
      style={[st.btn, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.7}
    >
      <Icon name={name} size={size} color={color ?? Colors.text} />
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
