import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../ThemeContext';

interface AppSurfaceProps {
  children: React.ReactNode;
  padding?: number;
  radius?: number;
  elevated?: boolean;
  noBorder?: boolean;
  style?: ViewStyle;
}

export default function AppSurface({
  children,
  padding = 16,
  radius = 16,
  elevated = true,
  noBorder = false,
  style,
}: AppSurfaceProps) {
  const { Colors, Shadow } = useTheme();

  return (
    <View
      style={[
        st.base,
        {
          backgroundColor: Colors.bgCard,
          borderRadius: radius,
          padding,
        },
        !noBorder && { borderWidth: 0.5, borderColor: Colors.border },
        elevated && Shadow.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  base: { width: '100%' },
});
