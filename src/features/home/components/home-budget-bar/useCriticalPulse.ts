import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '@/ThemeContext';

/**
 * Pulse animation when monthly target status is "kritisch".
 */
export function useCriticalPulse(isKritisch: boolean) {
  const { isSimpleMode } = useTheme();
  const pulseOp = useSharedValue(1);

  useEffect(() => {
    if (isKritisch) {
      const dur = isSimpleMode ? 1400 : 700;
      pulseOp.value = withRepeat(
        withSequence(
          withTiming(isSimpleMode ? 0.35 : 0.5, { duration: dur }),
          withTiming(1, { duration: dur }),
        ),
        -1,
        true,
      );
      return () => cancelAnimation(pulseOp);
    }
    cancelAnimation(pulseOp);
    pulseOp.value = 1;
  }, [isKritisch, isSimpleMode]); // pulseOp intentional stable ref-like

  return useAnimatedStyle(() => ({ opacity: pulseOp.value }));
}
