/**
 * SkiaRefreshIndicator (#41)
 *
 * Premium pull-to-refresh visual. Rendered as a floating overlay at the
 * top of the screen — sits ABOVE the ScrollView so it doesn't affect layout.
 *
 * Usage:
 *   - Pass `refreshing` from ScrollView's RefreshControl state.
 *   - Use `tintColor="transparent"` on the underlying RefreshControl so
 *     the standard spinner is hidden.
 *
 * Visual: three orbiting aura rings that pulse while refreshing,
 * then converge and fade when done.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring,
  cancelAnimation, Easing,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';

// ── One pulsing ring ──────────────────────────────────────────────────────────

function AuraRing({
  color,
  size,
  delay,
  active,
}: {
  color: string;
  size:  number;
  delay: number;
  active: boolean;
}) {
  const scale   = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value   = withRepeat(
        withSequence(
          withTiming(1.0, { duration: 600 + delay, easing: Easing.out(Easing.sin) }),
          withTiming(0.6, { duration: 600 + delay, easing: Easing.in(Easing.sin)  }),
        ),
        -1,
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value   = withSpring(0.6, { damping: 14, stiffness: 200 });
      opacity.value = withTiming(0,   { duration: 200 });
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.ring,
        {
          width:           size,
          height:          size,
          borderRadius:    size / 2,
          borderColor:     color,
          marginLeft:     -(size / 2),
          marginTop:      -(size / 2),
        },
        style,
      ]}
    />
  );
}

// ── Center dot ────────────────────────────────────────────────────────────────

function CenterDot({ color, active }: { color: string; active: boolean }) {
  const scale   = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      scale.value   = withSpring(1,   { damping: 12, stiffness: 280 });
      opacity.value = withTiming(0.9, { duration: 150 });
    } else {
      scale.value   = withSpring(0,   { damping: 14, stiffness: 300 });
      opacity.value = withTiming(0,   { duration: 150 });
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[st.dot, { backgroundColor: color }, style]}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface SkiaRefreshIndicatorProps {
  refreshing: boolean;
  topOffset?: number;
}

export default function SkiaRefreshIndicator({
  refreshing,
  topOffset = 56,
}: SkiaRefreshIndicatorProps) {
  const { Colors: C } = useTheme();

  if (!refreshing) return null;

  return (
    <View
      pointerEvents="none"
      style={[st.container, { top: topOffset }]}
    >
      <View style={st.center}>
        <AuraRing color={`${C.primary}55`} size={64} delay={0}   active={refreshing} />
        <AuraRing color={`${C.primary}35`} size={44} delay={150} active={refreshing} />
        <AuraRing color={`${C.primary}20`} size={28} delay={300} active={refreshing} />
        <CenterDot color={C.primary} active={refreshing} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    position:       'absolute',
    left:           0,
    right:          0,
    alignItems:     'center',
    zIndex:         999,
    pointerEvents:  'none',
  },
  center: {
    width:          80,
    height:         80,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  ring: {
    position:     'absolute',
    top:          '50%',
    left:         '50%',
    borderWidth:  1.5,
  },
  dot: {
    width:        14,
    height:       14,
    borderRadius: 7,
    position:     'absolute',
  },
});
