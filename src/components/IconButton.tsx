import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  activeOpacity?: number;
  accessibilityLabel?: string;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export default function IconButton({
  onPress,
  children,
  style,
  activeOpacity = 0.65,
  accessibilityLabel,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.btn, style]}
      hitSlop={HIT_SLOP}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
