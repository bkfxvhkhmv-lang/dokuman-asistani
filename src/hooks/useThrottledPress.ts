/**
 * useThrottledPress (#20 — frontend rate limit)
 *
 * Wraps an action so it can only fire once per `intervalMs`.
 * Prevents spam-clicking from hammering the backend even before
 * the network request leaves the device.
 *
 * Usage:
 *   const handlePay = useThrottledPress(() => dispatch(payAction()), 800);
 */

import { useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

export function useThrottledPress<T extends unknown[]>(
  fn:         (...args: T) => void,
  intervalMs: number = 800,
): (...args: T) => void {
  const lastFire = useRef(0);

  return useCallback((...args: T) => {
    const now = Date.now();
    if (now - lastFire.current < intervalMs) {
      // Blocked — light haptic so user knows it registered but is rate-limited
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    lastFire.current = now;
    fn(...args);
  }, [fn, intervalMs]); // eslint-disable-line react-hooks/exhaustive-deps
}
