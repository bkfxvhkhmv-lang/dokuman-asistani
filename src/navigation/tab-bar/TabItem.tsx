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
  const label = resolveLabel(route, options);
  const color = isFocused ? Colors.primary : Colors.textTertiary;

  const floatY = useSharedValue(0);
  const scale  = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      // Tap-feedback: kucul, sonra normal boyuta yaylan
      scale.value  = withSequence(
        withSpring(0.80, { damping: 10, stiffness: 340 }),
        withSpring(1,    { damping: 14, stiffness: 280 }),
      );
      // Aktif tab'da ikon hafifce yukari kalksin (scan ucmaz)
      floatY.value = isScan ? 0 : withSpring(-5, { damping: 14, stiffness: 260 });
    } else {
      floatY.value = withSpring(0, { damping: 14, stiffness: 260 });
    }
  }, [isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: scale.value }],
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
              { fontSize: fs(10), color: isFocused ? Colors.primaryDark : Colors.textTertiary, opacity: effectiveCollapsed ? 0.82 : 1 },
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
