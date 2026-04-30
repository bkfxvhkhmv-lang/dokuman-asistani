import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Sheet açıkken slide + parlama döngüsü; kapalı iken sıfırlanır.
 */
export function usePostCapturePresence(visible: boolean) {
  const slideY     = useRef(new Animated.Value(600)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const glowOp     = useRef(new Animated.Value(0.5)).current;
  const loopRef    = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY,     { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 300 }),
        Animated.timing(backdropOp, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOp, { toValue: 1.0, duration: 1100, useNativeDriver: true }),
          Animated.timing(glowOp, { toValue: 0.35, duration: 1100, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      loopRef.current = null;
      Animated.parallel([
        Animated.timing(slideY,     { toValue: 600, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOp, { toValue: 0,   duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return { slideY, backdropOp, glowOp };
}
