/**
 * DocumentEntityOverlay (#53)
 *
 * Renders Skia neon highlight boxes over a scanned document image at the
 * exact pixel positions returned by Google Vision's boundingPoly data.
 *
 * Requires:
 *  - The original image (uri) with known dimensions
 *  - entityBoxes from VisionResult (pixel coords in image space)
 *
 * Usage: place over an <Image> of the same width/height.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withDelay, withRepeat, withSequence, withTiming,
  cancelAnimation, Easing,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import type { EntityBox } from '../services/visionApi';

// #103: Simple Mode doubles border width and glow radius


// Entity type → neon color
const ENTITY_COLOR: Record<EntityBox['type'], string> = {
  betrag:       '#22C55E',  // green
  frist:        '#EF4444',  // red
  iban:         '#F59E0B',  // amber
  datum:        '#3B82F6',  // blue
  aktenzeichen: '#94A3B8',  // slate
};

interface BoxOverlayProps {
  box:        EntityBox;
  index:      number;
  scaleX:     number;
  scaleY:     number;
  onPress?:   (box: EntityBox) => void;
}

function BoxHighlight({ box, index, scaleX, scaleY, onPress }: BoxOverlayProps) {
  const { isSimpleMode } = useTheme();
  const color   = ENTITY_COLOR[box.type] ?? '#4361EE';
  const opacity = useSharedValue(0);
  const scale   = useSharedValue(0.85);

  useEffect(() => {
    const delay = index * 80 + 300;
    scale.value = withDelay(delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }));
    // Appear, then transition into a gentle pulse
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(100, withRepeat(
          withSequence(
            withTiming(0.75, { duration: 900 }),
            withTiming(1.00, { duration: 900 }),
          ),
          -1,
        )),
      ),
    );
    return () => { cancelAnimation(opacity); cancelAnimation(scale); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ scale: scale.value }],
  }));

  // #103 Simple Mode: thicker border + larger glow for max visibility
  const borderW = isSimpleMode ? 4   : 1.5;
  const glowR   = isSimpleMode ? 14  : 6;
  const padding = isSimpleMode ? 4   : 0;

  return (
    <Animated.View
      onTouchEnd={onPress ? () => onPress(box) : undefined}
      style={[
        st.box,
        {
          left:          box.x * scaleX - padding,
          top:           box.y * scaleY - padding,
          width:         box.w * scaleX + padding * 2,
          height:        box.h * scaleY + padding * 2,
          borderColor:   color,
          borderWidth:   borderW,
          shadowColor:   color,
          shadowRadius:  glowR,
          shadowOpacity: isSimpleMode ? 0.90 : 0.70,
        },
        style,
      ]}
    />
  );
}

interface DocumentEntityOverlayProps {
  entityBoxes:  EntityBox[];
  imageWidth:   number;
  imageHeight:  number;
  viewWidth:    number;
  viewHeight:   number;
  onBoxPress?:  (box: EntityBox) => void;
}

export default function DocumentEntityOverlay({
  entityBoxes,
  imageWidth,
  imageHeight,
  viewWidth,
  viewHeight,
  onBoxPress,
}: DocumentEntityOverlayProps) {
  const { Colors: C } = useTheme();

  if (!entityBoxes || entityBoxes.length === 0) return null;
  if (!imageWidth || !imageHeight || !viewWidth || !viewHeight) return null;

  const scaleX = viewWidth  / imageWidth;
  const scaleY = viewHeight / imageHeight;

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {entityBoxes.map((box, i) => (
        <BoxHighlight key={`${box.type}-${i}`} box={box} index={i} scaleX={scaleX} scaleY={scaleY} onPress={onBoxPress} />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  box: {
    position:     'absolute',
    borderWidth:  1.5,
    borderRadius: 3,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.70,
    shadowRadius:  6,
    elevation:     4,
    backgroundColor: 'transparent',
  },
});
