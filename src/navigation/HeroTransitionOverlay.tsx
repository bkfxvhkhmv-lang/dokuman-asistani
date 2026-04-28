/**
 * HeroTransitionOverlay
 *
 * Sits above all screens (rendered in root layout as sibling of <Stack>).
 * When TransitionStore.trigger() fires:
 *   1. A colored rect appears at card coordinates
 *   2. Springs to fill the entire screen
 *   3. Fades out — revealing the already-mounted DetailScreen beneath
 *
 * The detail screen uses animation:"none" so it's already rendered when
 * the overlay starts to fade.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet } from 'react-native';
import { TransitionStore, type CardTransitionGeometry } from './transitionStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const SPRING = { damping: 22, stiffness: 160, mass: 0.85, useNativeDriver: false } as const;

export default function HeroTransitionOverlay() {
  const [active, setActive] = useState(false);
  const colorRef = useRef('#ffffff');

  const left   = useRef(new Animated.Value(0)).current;
  const top    = useRef(new Animated.Value(0)).current;
  const width  = useRef(new Animated.Value(100)).current;
  const height = useRef(new Animated.Value(60)).current;
  const radius = useRef(new Animated.Value(20)).current;
  const opaque = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return TransitionStore.subscribe((geo: CardTransitionGeometry) => {
      // Snap to card position
      colorRef.current = geo.accentColor;
      left.setValue(geo.x);
      top.setValue(geo.y);
      width.setValue(geo.width);
      height.setValue(geo.height);
      radius.setValue(20);
      opaque.setValue(1);
      setActive(true);

      // Expand to full screen
      Animated.parallel([
        Animated.spring(left,   { toValue: 0,        ...SPRING }),
        Animated.spring(top,    { toValue: 0,        ...SPRING }),
        Animated.spring(width,  { toValue: SCREEN_W, ...SPRING }),
        Animated.spring(height, { toValue: SCREEN_H, ...SPRING }),
        Animated.spring(radius, { toValue: 0,        damping: 28, stiffness: 260, mass: 0.5, useNativeDriver: false }),
      ]).start(() => {
        // Brief hold so the detail screen is visible, then fade out
        Animated.timing(opaque, { toValue: 0, duration: 120, useNativeDriver: false }).start(() => {
          setActive(false);
        });
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.overlay,
        {
          left,
          top,
          width,
          height,
          borderRadius: radius,
          opacity:      opaque,
          backgroundColor: colorRef.current,
        },
      ]}
    />
  );
}

const st = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex:   9999,
  },
});
