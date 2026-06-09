/**
 * HeroTransitionOverlay
 *
 * Disabled — the JS overlay approach was producing a perceptible single-tone
 * fullscreen frame on light theme (Colors.bg ≈ #F5F4F0 looks like a white flash).
 *
 * The destination screen now uses the native fade animation (configured in
 * `app/_layout.tsx`) which keeps both screens visible during the transition
 * and avoids any solid-color frame.
 *
 * The TransitionStore listener is kept as a no-op so existing callers keep
 * working without changes.
 */

import { useEffect } from 'react';
import { TransitionStore } from '@/navigation/transitionStore';

export default function HeroTransitionOverlay() {
  useEffect(() => {
    return TransitionStore.subscribe(() => {
      // intentionally empty — handled by native screen transition
    });
  }, []);
  return null;
}
