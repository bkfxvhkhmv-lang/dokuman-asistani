/**
 * usePrivacyGate
 *
 * Two-layer privacy when the user leaves the app:
 *
 *  1. IMMEDIATE — opaque overlay appears the instant the app goes to background
 *     so the App Switcher never shows sensitive content (#102)
 *
 *  2. BIOMETRIC — when the app returns to the foreground, SperrBildschirm
 *     triggers FaceID / Fingerprint before the overlay lifts (#101)
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface PrivacyGateState {
  overlayVisible: boolean;   // #102 — opaque cover (shown immediately on background)
  lockVisible:    boolean;   // #101 — biometric gate (shown on foreground return)
  onUnlocked:     () => void;
}

export function usePrivacyGate(): PrivacyGateState {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [lockVisible,    setLockVisible]    = useState(false);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasBackground = useRef(false);

  const onUnlocked = () => {
    setLockVisible(false);
    setOverlayVisible(false);
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (next === 'background' || next === 'inactive') {
        // Show opaque cover immediately → App Switcher never sees content
        setOverlayVisible(true);
        wasBackground.current = true;
      } else if (next === 'active' && wasBackground.current) {
        wasBackground.current = false;
        // Overlay stays visible — SperrBildschirm (biometric) will dismiss it on success
        setLockVisible(true);
      }
    });

    return () => sub.remove();
  }, []);

  return { overlayVisible, lockVisible, onUnlocked };
}
