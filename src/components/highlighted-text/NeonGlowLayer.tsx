import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SKIA_OK, SkCanvas, SkRect, SkLinearGrad, skVec } from './skiaDeps';

export function NeonGlowLayer({
  containerW,
  containerH,
  neonColors,
}: {
  containerW: number;
  containerH: number;
  neonColors: string[];
}) {
  const glowOp = useSharedValue(0);

  useEffect(() => {
    glowOp.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.25, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(glowOp);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({ opacity: glowOp.value }));

  if (!SKIA_OK || containerW === 0 || neonColors.length === 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, animStyle]}
    >
      <SkCanvas style={StyleSheet.absoluteFill}>
        {neonColors.map((color, i) => {
          const yStart = (i / neonColors.length) * containerH;
          const yEnd = ((i + 1) / neonColors.length) * containerH;
          return (
            <SkRect key={i} x={0} y={yStart} width={containerW} height={yEnd - yStart}>
              <SkLinearGrad
                start={skVec(0, yStart)}
                end={skVec(containerW, yEnd)}
                colors={['transparent', `${color}12`, 'transparent']}
              />
            </SkRect>
          );
        })}
      </SkCanvas>
    </Animated.View>
  );
}
