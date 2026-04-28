/**
 * FloatingActionPulse
 *
 * Urgency-aware floating CTA that pulses to draw attention.
 * Shows when a document has an upcoming deadline or unpaid amount.
 * Disappears after the user taps or after the document is resolved.
 *
 * Pulse intensity scales with urgency:
 *   high   → fast red pulse (2× per second)
 *   medium → slower amber pulse (1× per second)
 *   low    → faint blue glow (no pulse)
 */

import React, { useEffect } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring,
  cancelAnimation, Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';

export type PulseUrgency = 'high' | 'medium' | 'low';

export interface FloatingActionPulseProps {
  visible:   boolean;
  label:     string;
  sublabel?: string;
  icon?:     string;
  urgency?:  PulseUrgency;
  onPress:   () => void;
}

const URGENCY_COLOR: Record<PulseUrgency, string> = {
  high:   '#EF4444',
  medium: '#F59E0B',
  low:    '#4361EE',
};

const PULSE_DURATION: Record<PulseUrgency, number> = {
  high:   420,
  medium: 700,
  low:    0,   // no pulse, static glow
};

export default function FloatingActionPulse({
  visible, label, sublabel, icon = 'flash', urgency = 'medium', onPress,
}: FloatingActionPulseProps) {
  const insets = useSafeAreaInsets();
  const color  = URGENCY_COLOR[urgency];
  const dur    = PULSE_DURATION[urgency];

  const slideY    = useSharedValue(120);
  const opacity   = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOp    = useSharedValue(0.6);

  // Mount / unmount animation
  useEffect(() => {
    if (visible) {
      slideY.value  = withSpring(0,   { damping: 20, stiffness: 240 });
      opacity.value = withTiming(1,   { duration: 220 });

      if (dur > 0) {
        glowScale.value = withRepeat(
          withSequence(
            withTiming(1.18, { duration: dur, easing: Easing.out(Easing.quad) }),
            withTiming(1.00, { duration: dur, easing: Easing.in(Easing.quad) }),
          ),
          -1,
        );
        glowOp.value = withRepeat(
          withSequence(
            withTiming(0.0, { duration: dur }),
            withTiming(0.6, { duration: dur }),
          ),
          -1,
        );
      } else {
        glowScale.value = 1;
        glowOp.value    = 0.3;
      }
    } else {
      cancelAnimation(glowScale);
      cancelAnimation(glowOp);
      slideY.value  = withTiming(120, { duration: 200 });
      opacity.value = withTiming(0,   { duration: 160 });
      glowScale.value = 1;
      glowOp.value    = 0;
    }
  }, [visible, dur]); // eslint-disable-line react-hooks/exhaustive-deps

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
    opacity:   opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity:   glowOp.value,
  }));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        st.wrapper,
        { bottom: (insets.bottom || 16) + 16 },
        containerStyle,
      ]}
    >
      {/* Glow ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          st.glow,
          { backgroundColor: color + '44', borderColor: color + '88' },
          glowStyle,
        ]}
      />

      {/* Button */}
      <TouchableOpacity
        style={[st.btn, { backgroundColor: color }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={st.iconWrap}>
          <Icon name={icon} size={20} color="#fff" />
        </View>
        <View style={st.textWrap}>
          <Text style={st.label} numberOfLines={1}>{label}</Text>
          {sublabel ? (
            <Text style={st.sublabel} numberOfLines={1}>{sublabel}</Text>
          ) : null}
        </View>
        <Icon name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrapper: {
    position:      'absolute',
    left:          20,
    right:         20,
    alignItems:    'center',
    zIndex:        99,
  },
  glow: {
    position:     'absolute',
    top:          -8, bottom: -8, left: -8, right: -8,
    borderRadius: 28,
    borderWidth:  1.5,
  },
  btn: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   20,
    paddingVertical:   14,
    paddingHorizontal: 18,
    gap:            12,
    width:          '100%',
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 6 },
    shadowOpacity:  0.28,
    shadowRadius:   14,
    elevation:      10,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  label:    { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  sublabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
});
