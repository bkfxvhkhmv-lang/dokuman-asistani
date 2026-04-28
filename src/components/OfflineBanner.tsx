/**
 * OfflineBanner
 *
 * Floats at the top of any screen when the server is unreachable.
 * Reads from the TanStack Query health check — no extra network calls.
 * Disappears automatically once connection is restored.
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, cancelAnimation,
} from 'react-native-reanimated';
import { useHealthQuery } from '../hooks/queryHooks';
import { useTheme } from '../ThemeContext';
import { HIT_SLOP } from '../theme';

export default function OfflineBanner() {
  const { Colors: C } = useTheme();
  const { isError, refetch, isFetching } = useHealthQuery();

  const translateY = useSharedValue(-60);
  const opacity    = useSharedValue(0);

  useEffect(() => {
    if (isError) {
      translateY.value = withSpring(0,    { damping: 18, stiffness: 200 });
      opacity.value    = withTiming(1,    { duration: 200 });
    } else {
      translateY.value = withSpring(-60,  { damping: 18, stiffness: 200 });
      opacity.value    = withTiming(0,    { duration: 150 });
    }
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, [isError]); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity:   opacity.value,
  }));

  if (!isError) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[st.banner, { backgroundColor: C.warningLight, borderColor: `${C.warning}55` }, animStyle]}
    >
      <View style={[st.dot, { backgroundColor: C.warning }]} />
      <Text style={[st.text, { color: C.warningText || C.warning }]} numberOfLines={1}>
        Verbindung unterbrochen — lokale Daten verfügbar
      </Text>
      <TouchableOpacity
        onPress={() => refetch()}
        hitSlop={HIT_SLOP}
        disabled={isFetching}
        style={[st.retryBtn, { backgroundColor: C.warning }]}
      >
        <Text style={st.retryText}>{isFetching ? '…' : '↻'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  banner: {
    position:          'absolute',
    top:               0,
    left:              16,
    right:             16,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    paddingHorizontal: 14,
    paddingVertical:   9,
    borderRadius:      14,
    borderWidth:       1,
    zIndex:            9000,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.10,
    shadowRadius:      12,
    elevation:         8,
  },
  dot:       { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  text:      { flex: 1, fontSize: 11, fontWeight: '600', letterSpacing: -0.1 },
  retryBtn:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
