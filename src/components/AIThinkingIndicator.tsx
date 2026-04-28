/**
 * AIThinkingIndicator
 *
 * Shows while DocumentDigitalTwin or other heavy AI computations run.
 * Three orbiting particles + pulsing core — "the assistant is reading".
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
  cancelAnimation, Easing,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';

// ── Single orbiting dot ────────────────────────────────────────────────────

function OrbitDot({
  index,
  color,
  radius,
}: {
  index:  number;
  color:  string;
  radius: number;
}) {
  const opacity = useSharedValue(0.2);
  const scale   = useSharedValue(0.6);

  useEffect(() => {
    const delay = index * 220;
    opacity.value = withRepeat(
      withDelay(delay, withSequence(
        withTiming(1,   { duration: 300, easing: Easing.out(Easing.sin) }),
        withTiming(0.2, { duration: 400, easing: Easing.in(Easing.sin)  }),
      )),
      -1,
    );
    scale.value = withRepeat(
      withDelay(delay, withSequence(
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.sin) }),
        withTiming(0.6, { duration: 400, easing: Easing.in(Easing.sin)  }),
      )),
      -1,
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const angle = (index / 3) * 2 * Math.PI;
  const x     = Math.cos(angle) * radius;
  const y     = Math.sin(angle) * radius;

  return (
    <Animated.View
      style={[
        st.dot,
        {
          backgroundColor: color,
          position: 'absolute',
          left: 24 + x - 4,   // 24 = center of 48px container
          top:  24 + y - 4,
        },
        style,
      ]}
    />
  );
}

// ── Pulsing core ──────────────────────────────────────────────────────────

function PulsingCore({ color }: { color: string }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0,  { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 700 }),
        withTiming(0.6, { duration: 700 }),
      ),
      -1,
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View style={[st.core, { backgroundColor: color }, style]}>
      <Text style={st.coreEmoji}>🧠</Text>
    </Animated.View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface AIThinkingIndicatorProps {
  label?: string;
  compact?: boolean;
}

export default function AIThinkingIndicator({
  label   = 'Analysiere Dokument…',
  compact = false,
}: AIThinkingIndicatorProps) {
  const { Colors: C } = useTheme();

  return (
    <View style={[st.container, compact && st.containerCompact]}>
      {/* Orbit system */}
      <View style={st.orbit}>
        <PulsingCore color={C.primary} />
        {[0, 1, 2].map(i => (
          <OrbitDot key={i} index={i} color={C.primary} radius={20} />
        ))}
      </View>

      {/* Label */}
      <Text style={[st.label, { color: C.textTertiary }]}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    alignItems:    'center',
    justifyContent:'center',
    paddingVertical: 20,
    gap:           10,
  },
  containerCompact: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  orbit: {
    width:  48,
    height: 48,
    position: 'relative',
  },
  core: {
    position:     'absolute',
    left:         14,
    top:          14,
    width:        20,
    height:       20,
    borderRadius: 10,
    alignItems:   'center',
    justifyContent: 'center',
  },
  coreEmoji: { fontSize: 10 },
  dot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  label: {
    fontSize:      11,
    fontStyle:     'italic',
    fontWeight:    '500',
    letterSpacing: 0.1,
  },
});
