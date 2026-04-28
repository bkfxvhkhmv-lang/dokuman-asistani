import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../ThemeContext';

interface AppChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  selectedColor?: string;
  selectedTextColor?: string;
}

export default function AppChip({
  label,
  selected = false,
  onPress,
  style,
  selectedColor,
  selectedTextColor,
}: AppChipProps) {
  const { Colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        st.base,
        {
          backgroundColor: selected ? (selectedColor || Colors.primaryLight) : 'transparent',
          borderColor: selected ? 'transparent' : Colors.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          st.label,
          {
            color: selected ? (selectedTextColor || Colors.primaryDark) : Colors.textTertiary,
            fontWeight: selected ? '700' : '500',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  base: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  label: { fontSize: 13 },
});
