import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeContext';
import type { SharedValue } from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');
const SHIMMER_W = Math.round(SCREEN_W * 0.72);

// ── Shimmer bar — shares the card's animation value (perfect sync) ─────────

function ShimmerBar({
  style,
  x,
}: {
  style: object;
  x: SharedValue<number>;
}) {
  const { Colors } = useTheme();
  const animStyle  = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={[st.barBase, { backgroundColor: Colors.borderLight }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.62)',
            'rgba(255,255,255,0.80)',
            'rgba(255,255,255,0.62)',
            'transparent',
          ]}
          locations={[0, 0.35, 0.50, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: SHIMMER_W, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

// ── Single card skeleton ───────────────────────────────────────────────────

interface SkeletonKarteProps {
  index?: number; // stagger delay
}

export default function SkeletonKarte({ index = 0 }: SkeletonKarteProps) {
  const { Colors } = useTheme();

  // One shared value per card — all bars animate in perfect lock-step
  const shimmerX = useSharedValue(-SHIMMER_W);
  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(SCREEN_W + SHIMMER_W, {
        duration:  1050,
        easing:    Easing.bezier(0.4, 0.0, 0.6, 1.0),
      }),
      -1,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55).springify().damping(22).stiffness(180)}
      style={[st.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}
    >
      {/* Left accent stripe */}
      <View style={[st.stripe, { backgroundColor: Colors.borderLight }]} />

      <View style={st.body}>
        {/* Header row */}
        <View style={st.headerRow}>
          <ShimmerBar style={st.avatar} x={shimmerX} />
          <View style={st.titleCol}>
            <ShimmerBar style={st.lineTitle} x={shimmerX} />
            <ShimmerBar style={st.lineSub}   x={shimmerX} />
          </View>
          <ShimmerBar style={st.badge} x={shimmerX} />
        </View>

        {/* Body lines */}
        <ShimmerBar style={[st.lineBody, { marginTop: 14 }]} x={shimmerX} />
        <ShimmerBar style={[st.lineBodyShort, { marginTop: 7 }]} x={shimmerX} />

        {/* Footer chips */}
        <View style={[st.footer, { marginTop: 14 }]}>
          <ShimmerBar style={st.chip} x={shimmerX} />
          <ShimmerBar style={st.chip} x={shimmerX} />
        </View>
      </View>
    </Animated.View>
  );
}

export function SkeletonListe({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKarte key={i} index={i} />
      ))}
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth:  1,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow:     'hidden',
    flexDirection:'row',
  },
  stripe: { width: 3 },
  body: { flex: 1, padding: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  barBase: {
    overflow:     'hidden',
    borderRadius: 6,
  },
  avatar:        { width: 44, height: 44, borderRadius: 14 },
  titleCol:      { flex: 1, gap: 8 },
  lineTitle:     { height: 14, width: '70%' },
  lineSub:       { height: 11, width: '45%', marginTop: 0 },
  badge:         { width: 56, height: 26, borderRadius: 13 },
  lineBody:      { height: 12, width: '90%' },
  lineBodyShort: { height: 12, width: '60%' },
  footer:        { flexDirection: 'row', gap: 8 },
  chip:          { height: 28, width: 72, borderRadius: 14 },
});
