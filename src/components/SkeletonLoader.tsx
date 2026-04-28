import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
  FadeInDown, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeContext';
import type { SharedValue } from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');
const SHIMMER_W = Math.round(SCREEN_W * 0.72);

// ── Shared shimmer hook ────────────────────────────────────────────────────

function useShimmer(): SharedValue<number> {
  const x = useSharedValue(-SHIMMER_W);
  useEffect(() => {
    x.value = withRepeat(
      withTiming(SCREEN_W + SHIMMER_W, {
        duration: 1050,
        easing:   Easing.bezier(0.4, 0.0, 0.6, 1.0),
      }),
      -1,
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return x;
}

// ── Shimmer bar primitive ──────────────────────────────────────────────────

function ShimmerBar({
  style,
  x,
}: {
  style?: ViewStyle;
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
          colors={['transparent', 'rgba(255,255,255,0.72)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: SHIMMER_W, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

// ── Document card skeleton ─────────────────────────────────────────────────

function SkeletonCard({ index = 0 }: { index?: number }) {
  const { Colors } = useTheme();
  const x = useShimmer();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55).springify().damping(22).stiffness(180)}
      style={[st.card, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}
    >
      <View style={st.row}>
        <ShimmerBar style={st.iconBox} x={x} />
        <View style={{ flex: 1, gap: 8 }}>
          <ShimmerBar style={{ height: 12, width: '70%' } as ViewStyle} x={x} />
          <ShimmerBar style={{ height: 10, width: '45%' } as ViewStyle} x={x} />
        </View>
        <ShimmerBar style={{ height: 22, width: 52, borderRadius: 999 } as ViewStyle} x={x} />
      </View>
      <ShimmerBar style={{ height: 10, width: '90%', marginTop: 12 } as ViewStyle} x={x} />
      <ShimmerBar style={{ height: 10, width: '65%', marginTop: 6  } as ViewStyle} x={x} />
      <View style={[st.row, { marginTop: 14 }]}>
        <ShimmerBar style={{ height: 24, width: 80, borderRadius: 999 } as ViewStyle} x={x} />
      </View>
    </Animated.View>
  );
}

// ── Stats row skeleton ─────────────────────────────────────────────────────

function SkeletonStatsRow() {
  const { Colors } = useTheme();
  const x = useShimmer();

  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 }}>
      {[0, 1, 2].map(i => (
        <Animated.View
          key={i}
          entering={FadeInDown.delay(i * 40).springify().damping(22).stiffness(180)}
          style={[st.statCard, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}
        >
          <ShimmerBar style={{ height: 26, width: 32, borderRadius: 6, alignSelf: 'center', marginBottom: 8 } as ViewStyle} x={x} />
          <ShimmerBar style={{ height: 9, width: '70%', alignSelf: 'center' } as ViewStyle} x={x} />
        </Animated.View>
      ))}
    </View>
  );
}

// ── Section header skeleton ────────────────────────────────────────────────

function SkeletonSectionHeader() {
  const x = useShimmer();

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <View style={{ gap: 6 }}>
        <ShimmerBar style={{ height: 9,  width: 60  } as ViewStyle} x={x} />
        <ShimmerBar style={{ height: 14, width: 140 } as ViewStyle} x={x} />
      </View>
      <ShimmerBar style={{ height: 30, width: 30, borderRadius: 15 } as ViewStyle} x={x} />
    </View>
  );
}

// ── Full home skeleton ─────────────────────────────────────────────────────

export function HomeSkeletonLoader() {
  return (
    <View style={{ flex: 1 }}>
      <SkeletonStatsRow />
      <SkeletonSectionHeader />
      {[0, 1, 2, 3].map(i => (
        <SkeletonCard key={i} index={i} />
      ))}
    </View>
  );
}

export default SkeletonCard;

// ── Styles ─────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  barBase: {
    overflow:     'hidden',
    borderRadius: 8,
  },
  card: {
    marginHorizontal: 16,
    marginVertical:   6,
    borderRadius:     20,
    padding:          16,
    borderWidth:      1,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  iconBox: {
    width:        44,
    height:       44,
    borderRadius: 14,
  },
  statCard: {
    flex:         1,
    borderRadius: 18,
    padding:      14,
    borderWidth:  1,
  },
});
