/**
 * Tek bir tab item'i — ikon + label + active pill animasyonu.
 *
 * Scan butonu ozel: bar'in ustune tasar (`scanItem` + `scanWrap`),
 * label'i farkli boyutta (`scanLabel`).
 */
import React, { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { resolveLabel } from '@/navigation/tab-bar/utils';
import { tabStyles as st } from '@/navigation/tab-bar/styles';

interface Props {
  route:              any;
  isFocused:          boolean;
  isScan:             boolean;
  options:            any;
  effectiveCollapsed: boolean;
  onPress:            () => void;
  onLongPress:        () => void;
}

export default function TabItem({
  route, isFocused, isScan, options, effectiveCollapsed,
  onPress, onLongPress,
}: Props) {
  const { Colors, fs } = useTheme();
  const { t: T } = useT();
  // Translate tab label based on route name
  const rawLabel = resolveLabel(route, options);
  const label = route.name === 'index'    ? '📄 ' + T('tab.documents')
              : route.name === 'Suche'    ? T('tab.search')
              : route.name === 'Kamera'   ? T('tab.scan')
              : route.name === 'Export'   ? T('tab.export')
              : route.name === 'Profil'   ? T('tab.settings')
              : rawLabel;
  const color = isFocused ? Colors.primary : Colors.textSecondary;

  const scale = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      scale.value = withSequence(
        withSpring(0.82, { damping: 10, stiffness: 340 }),
        withSpring(1,    { damping: 14, stiffness: 280 }),
      );
    }
  }, [isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconNode = options.tabBarIcon
    ? options.tabBarIcon({ focused: isFocused, color, size: isScan ? 24 : 20 })
    : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[st.item, isScan && st.scanItem]}
    >
      <Animated.View style={[st.iconWrap, isScan && st.scanWrap, iconAnim]}>
        {iconNode}
      </Animated.View>

      {!isScan ? (
        <>
          <Text
            style={[
              st.label,
              { fontSize: fs(10), color: isFocused ? Colors.primaryDark : Colors.textSecondary, opacity: effectiveCollapsed ? 0.82 : 1 },
            ]}
            maxFontSizeMultiplier={1.0}
          >
            {label}
          </Text>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryMid]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[st.activePill, { opacity: isFocused ? 1 : 0 }]}
          />
        </>
      ) : (
        <Text
          style={[
            st.scanLabel,
            { fontSize: fs(9), color: isFocused ? Colors.primaryDark : Colors.textSecondary, opacity: effectiveCollapsed ? 0.82 : 1 },
          ]}
          maxFontSizeMultiplier={1.0}
        >
          Scan
        </Text>
      )}
    </Pressable>
  );
}
