import { useRef, useCallback } from 'react';
import { Animated, PanResponder } from 'react-native';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_DELAY = 260; // ms

export interface PinchZoomState {
  scale: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  reset: () => void;
}

export function usePinchZoom(): PinchZoomState {
  const scale      = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const currentScale = useRef(1);
  const currentOffset = useRef({ x: 0, y: 0 });
  const lastTapTime   = useRef(0);

  // Pinch state
  const initialPinchDistance = useRef<number | null>(null);
  const initialScale = useRef(1);

  const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

  const reset = useCallback(() => {
    currentScale.current = 1;
    currentOffset.current = { x: 0, y: 0 };
    Animated.parallel([
      Animated.spring(scale,      { toValue: 1, useNativeDriver: true, damping: 16, stiffness: 220 }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 220 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 220 }),
    ]).start();
  }, [scale, translateX, translateY]);

  const distance = (touches: { pageX: number; pageY: number }[]) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (e) => e.nativeEvent.touches.length >= 2 || currentScale.current > 1,
      onMoveShouldSetPanResponder:  (e) => e.nativeEvent.touches.length >= 2 || currentScale.current > 1,

      onPanResponderGrant: (e) => {
        const touches = e.nativeEvent.touches;

        // Double-tap to reset
        if (touches.length === 1) {
          const now = Date.now();
          if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
            reset();
          }
          lastTapTime.current = now;
        }

        if (touches.length === 2) {
          initialPinchDistance.current = distance(touches as any);
          initialScale.current = currentScale.current;
        }
        scale.setOffset(currentScale.current - 1);
        translateX.setOffset(currentOffset.current.x);
        translateY.setOffset(currentOffset.current.y);
        scale.setValue(0);
        translateX.setValue(0);
        translateY.setValue(0);
      },

      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches;

        if (touches.length === 2 && initialPinchDistance.current) {
          const newDist = distance(touches as any);
          const ratio = newDist / initialPinchDistance.current;
          const newScale = clampScale(initialScale.current * ratio) - (currentScale.current - 1) - 1;
          // Direct set for responsiveness
          scale.setValue(newScale);
        } else if (touches.length === 1 && currentScale.current > 1) {
          translateX.setValue(g.dx);
          translateY.setValue(g.dy);
        }
      },

      onPanResponderRelease: (e, g) => {
        scale.flattenOffset();
        translateX.flattenOffset();
        translateY.flattenOffset();

        const newScale = clampScale(currentScale.current);
        currentScale.current = newScale;
        currentOffset.current = {
          x: currentOffset.current.x + (newScale > 1 ? g.dx : 0),
          y: currentOffset.current.y + (newScale > 1 ? g.dy : 0),
        };

        if (newScale <= 1) {
          reset();
        } else {
          Animated.spring(scale, { toValue: newScale, useNativeDriver: true, damping: 18, stiffness: 200 }).start();
        }

        initialPinchDistance.current = null;
      },
    })
  ).current;

  return {
    scale,
    translateX,
    translateY,
    panHandlers: panResponder.panHandlers,
    reset,
  };
}
