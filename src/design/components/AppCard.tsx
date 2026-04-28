import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../ThemeContext';

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  radius?: number;
  padding?: number;
  borderColor?: string;
  backgroundColor?: string;
}

export default function AppCard({
  children,
  style,
  elevated = true,
  radius = 16,
  padding = 12,
  borderColor,
  backgroundColor,
}: AppCardProps) {
  const { Colors, Shadow } = useTheme();

  return (
    <View
      style={[
        st.base,
        {
          backgroundColor: backgroundColor || Colors.bgCard,
          borderColor: borderColor || Colors.border,
          borderRadius: radius,
          padding,
        },
        elevated && Shadow.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  base: { borderWidth: 0.5 },
});
