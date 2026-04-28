/**
 * FlyingCard — "Document sent to list" animation
 *
 * Shows a thumbnail of the captured document flying from
 * center-screen toward the bottom-right (simulating insertion
 * into the home list). Plays once, then calls onComplete.
 */

import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence, runOnJS,
} from 'react-native-reanimated';

interface Props {
  uri:        string;     // photo URI to show as thumbnail
  onComplete: () => void; // called when animation finishes
}

export default function FlyingCard({ uri, onComplete }: Props) {
  const scale     = useSharedValue(1);
  const opacity   = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Sequence: expand slightly → shrink + fly to bottom-right → fade
    scale.value = withSequence(
      withSpring(1.08, { damping: 12, stiffness: 200 }),
      withSpring(0.15, { damping: 18, stiffness: 160 }),
    );
    translateX.value = withSequence(
      withTiming(0,   { duration: 140 }),
      withTiming(120, { duration: 480 }),
    );
    translateY.value = withSequence(
      withTiming(-10,  { duration: 140 }),
      withTiming(340,  { duration: 480 }),
    );
    opacity.value = withSequence(
      withTiming(1,  { duration: 400 }),
      withTiming(0,  { duration: 220, }, () => runOnJS(onComplete)()),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[st.container, cardStyle]} pointerEvents="none">
      <Image source={{ uri }} style={st.image} resizeMode="cover" />
    </Animated.View>
  );
}

const st = StyleSheet.create({
  container: {
    position:     'absolute',
    alignSelf:    'center',
    top:          '35%',
    width:        160,
    height:       200,
    borderRadius: 18,
    overflow:     'hidden',
    shadowColor:  '#000',
    shadowOpacity: 0.35,
    shadowRadius:  20,
    shadowOffset:  { width: 0, height: 8 },
    elevation:     16,
    zIndex:        1000,
  },
  image: { width: '100%', height: '100%' },
});
