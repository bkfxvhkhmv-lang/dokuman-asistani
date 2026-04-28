import { useEffect } from 'react';
import {
  useSharedValue, useAnimatedStyle,
  withDelay, withTiming, Easing,
} from 'react-native-reanimated';

interface StaggerOptions {
  index:       number;
  baseDelay?:  number;
  duration?:   number;
  translateY?: number;
  enabled?:    boolean;
}

export function useStaggerFadeIn({
  index,
  baseDelay  = 40,
  duration   = 280,
  translateY = 14,
  enabled    = true,
}: StaggerOptions) {
  const opacity   = useSharedValue(enabled ? 0 : 1);
  const translate = useSharedValue(enabled ? translateY : 0);

  useEffect(() => {
    if (!enabled) return;
    const delay = index * baseDelay;
    opacity.value   = withDelay(delay, withTiming(1,          { duration, easing: Easing.out(Easing.quad) }));
    translate.value = withDelay(delay, withTiming(0,          { duration, easing: Easing.out(Easing.quad) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  return { animatedStyle };
}
