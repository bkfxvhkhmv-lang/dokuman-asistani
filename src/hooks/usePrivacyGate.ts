/**
 * usePrivacyGate
 *
 * Two-layer privacy when the user leaves the app (only when appSperre is ON
 * and the user is a signed-in non-guest outside excluded routes):
 *
 *  1. IMMEDIATE — opaque overlay on background (#102)
 *  2. BIOMETRIC — SperrBildschirm on foreground return (#101)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePathname } from 'expo-router';
import { useStore } from '@/store';
import { useAuth } from '@/providers/AuthContext';
import { isPrivacyGateBypassed, subscribePrivacyGateBypass } from './privacyGateBypass';

const LOCK_EXCLUDED_ROUTES = ['/login', '/onboarding', '/first-value'] as const;

export function isLockExcludedRoute(pathname: string): boolean {
  return LOCK_EXCLUDED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function shouldArmPrivacyGate(opts: {
  appSperre: boolean;
  user: { isGuest?: boolean } | null;
  authLoading: boolean;
  pathname: string;
}): boolean {
  if (!opts.appSperre) return false;
  if (opts.authLoading) return false;
  if (!opts.user || opts.user.isGuest) return false;
  if (isLockExcludedRoute(opts.pathname)) return false;
  if (isPrivacyGateBypassed()) return false;
  return true;
}

interface PrivacyGateState {
  overlayVisible: boolean;
  lockVisible: boolean;
  onUnlocked: () => void;
}

export function usePrivacyGate(): PrivacyGateState {
  const pathname = usePathname();
  const { state } = useStore();
  const { user, loading: authLoading } = useAuth();
  const appSperre = state.einstellungen.appSperre;

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [lockVisible, setLockVisible] = useState(false);
  const [bypassed, setBypassed] = useState(isPrivacyGateBypassed());

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasBackground = useRef(false);

  const policyRef = useRef({ appSperre, user, authLoading, pathname });
  policyRef.current = { appSperre, user, authLoading, pathname };

  const isArmed = useCallback((): boolean => {
    const p = policyRef.current;
    return shouldArmPrivacyGate({
      appSperre: p.appSperre,
      user: p.user,
      authLoading: p.authLoading,
      pathname: p.pathname,
    });
  }, []);

  const onUnlocked = () => {
    setLockVisible(false);
    setOverlayVisible(false);
  };

  useEffect(() => {
    return subscribePrivacyGateBypass(() => {
      const active = isPrivacyGateBypassed();
      setBypassed(active);
      if (active) {
        wasBackground.current = false;
        setLockVisible(false);
        setOverlayVisible(false);
      }
    });
  }, []);

  // Drop overlay/lock when policy no longer applies (route change, logout, toggle off).
  useEffect(() => {
    if (!isArmed()) {
      wasBackground.current = false;
      setLockVisible(false);
      setOverlayVisible(false);
    }
  }, [appSperre, user, authLoading, pathname, bypassed, isArmed]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (isPrivacyGateBypassed() || !isArmed()) {
        appStateRef.current = next;
        wasBackground.current = false;
        setLockVisible(false);
        setOverlayVisible(false);
        return;
      }

      appStateRef.current = next;

      if (next === 'background') {
        setOverlayVisible(true);
        wasBackground.current = true;
      } else if (next === 'inactive') {
        setOverlayVisible(true);
      } else if (next === 'active') {
        if (wasBackground.current) {
          wasBackground.current = false;
          setLockVisible(true);
        } else {
          setOverlayVisible(false);
        }
      }
    });

    return () => sub.remove();
  }, [isArmed]);

  const gated = !bypassed && isArmed();
  return {
    overlayVisible: gated && overlayVisible,
    lockVisible: gated && lockVisible,
    onUnlocked,
  };
}
