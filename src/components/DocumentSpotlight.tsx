/**
 * DocumentSpotlight (#56)
 *
 * Dims the full document preview and highlights one entity box.
 * Tapping an entity chip in DocumentEntityOverlay triggers this.
 *
 * Two-layer approach (no Skia required):
 *  1. A full-screen semi-transparent overlay (dim layer)
 *  2. A transparent "punch-through" hole at the entity position
 *     implemented via nested View with matching borderRadius
 *
 * The punch-through is achieved with a white background region
 * that removes the overlay via zIndex layering.
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import type { EntityBox } from '../services/visionApi';

const ENTITY_LABEL: Record<EntityBox['type'], string> = {
  betrag:       'Betrag',
  frist:        'Frist',
  iban:         'IBAN',
  datum:        'Datum',
  aktenzeichen: 'Aktenzeichen',
};

const ENTITY_COLOR: Record<EntityBox['type'], string> = {
  betrag:       '#22C55E',
  frist:        '#EF4444',
  iban:         '#F59E0B',
  datum:        '#3B82F6',
  aktenzeichen: '#94A3B8',
};

interface DocumentSpotlightProps {
  entity:      EntityBox | null;
  scaleX:      number;
  scaleY:      number;
  onDismiss:   () => void;
}

export default function DocumentSpotlight({
  entity,
  scaleX,
  scaleY,
  onDismiss,
}: DocumentSpotlightProps) {
  const { Colors: C } = useTheme();
  const opacity = useSharedValue(0);
  const holeScale = useSharedValue(0.5);

  useEffect(() => {
    if (entity) {
      opacity.value   = withTiming(1,   { duration: 250 });
      holeScale.value = withSpring(1,   { damping: 14, stiffness: 200 });
    } else {
      opacity.value   = withTiming(0,   { duration: 180 });
      holeScale.value = withTiming(0.5, { duration: 180 });
    }
    return () => { cancelAnimation(opacity); cancelAnimation(holeScale); };
  }, [entity]); // eslint-disable-line react-hooks/exhaustive-deps

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const holeStyle    = useAnimatedStyle(() => ({
    transform: [{ scale: holeScale.value }],
    opacity:   opacity.value,
  }));

  if (!entity) return null;

  const color     = ENTITY_COLOR[entity.type] ?? C.primary;
  const PADDING   = 10;
  const holeX     = entity.x * scaleX - PADDING;
  const holeY     = entity.y * scaleY - PADDING;
  const holeW     = entity.w * scaleX + PADDING * 2;
  const holeH     = entity.h * scaleY + PADDING * 2;

  return (
    <>
      {/* Dim overlay */}
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, st.overlay, overlayStyle]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
      </Animated.View>

      {/* Spotlight hole + label */}
      <Animated.View
        pointerEvents="none"
        style={[
          st.hole,
          {
            left:         holeX,
            top:          holeY,
            width:        holeW,
            height:       holeH,
            borderColor:  color,
            shadowColor:  color,
          },
          holeStyle,
        ]}
      />

      {/* Label tag */}
      <Animated.View
        pointerEvents="none"
        style={[
          st.label,
          {
            left:            holeX,
            top:             holeY - 28,
            backgroundColor: color,
          },
          holeStyle,
        ]}
      >
        <Text style={st.labelText}>{ENTITY_LABEL[entity.type]}: {entity.text}</Text>
      </Animated.View>
    </>
  );
}

const st = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.60)',
    zIndex:          10,
  },
  hole: {
    position:         'absolute',
    zIndex:           11,
    borderWidth:      2.5,
    borderRadius:     6,
    backgroundColor:  'transparent',
    shadowOffset:     { width: 0, height: 0 },
    shadowOpacity:    0.9,
    shadowRadius:     18,
    elevation:        16,
  },
  label: {
    position:         'absolute',
    zIndex:           12,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:     6,
  },
  labelText: {
    color:       '#fff',
    fontSize:    11,
    fontWeight:  '700',
    letterSpacing: -0.1,
  },
});
