/**
 * StickyBottomCTA — safe-area-aware bottom action bar.
 *
 * Tab screens: pass tabBarHeight={useBottomTabBarHeight()} so the bar
 * clears the tab bar + home indicator automatically.
 *
 * Modals / full-screen non-tab: omit tabBarHeight; the component falls
 * back to safeArea.bottom + 16.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';

interface Props {
  children: React.ReactNode;
  tabBarHeight?: number;
  noBorder?: boolean;
  style?: ViewStyle;
}

export default function StickyBottomCTA({ children, tabBarHeight, noBorder, style }: Props) {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();

  const paddingBottom =
    tabBarHeight != null
      ? tabBarHeight + 8
      : Math.max(16, insets.bottom + 16);

  return (
    <View
      style={[
        st.container,
        { backgroundColor: Colors.bg, paddingBottom },
        !noBorder && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderLight },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
});
