import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  loginUser, registerUser, logoutUser, loginWithGoogleIdToken,
  getStoredUser, setSessionExpiredHandler,
} from '@/services/authService';
import { clearLimits } from '@/services/guestLimitService';

const GUEST_MODE_KEY = '@briefpilot_guest_mode';

import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
} from '@/config/googleAuth';
import { setPrivacyGateBypassed } from '@/hooks/privacyGateBypass';

const OAUTH_PRIVACY_BYPASS_MS = 60_000;

function releaseOAuthPrivacyBypass() {
  setPrivacyGateBypassed(false);
}

WebBrowser.maybeCompleteAuthSession();
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  photo?: string;
  isGuest?: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<unknown>;
  register: (email: string, password: string) => Promise<unknown>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await getStoredUser();
        if (u) {
          setUser(u as AuthUser | null);
        } else {
          const guestMode = await AsyncStorage.getItem(GUEST_MODE_KEY);
          setUser(guestMode === 'true'
            ? { id: 'guest', email: 'gast@briefpilot.de', name: 'Gast', isGuest: true }
            : null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();

    setSessionExpiredHandler(() => { setUser(null); router.replace('/login'); });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginUser(email, password) as any;
    setUser({ id: data.user_id, email: data.email });
    void AsyncStorage.removeItem(GUEST_MODE_KEY);
    void clearLimits();
    return data;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const data = await registerUser(email, password) as any;
    setUser({ id: data.user_id, email: data.email });
    void AsyncStorage.removeItem(GUEST_MODE_KEY);
    void clearLimits();
    return data;
  }, []);

  const logout = useCallback(async () => {
    void AsyncStorage.removeItem(GUEST_MODE_KEY);
    await logoutUser();
    setUser(null);
    router.replace('/login');
  }, []);

  const loginAsGuest = useCallback(() => {
    void AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    setUser({ id: 'guest', email: 'gast@briefpilot.de', name: 'Gast', isGuest: true });
  }, []);

  const [, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId:     GOOGLE_WEB_CLIENT_ID,
    iosClientId:     GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type !== 'success') {
      releaseOAuthPrivacyBypass();
      return;
    }

    const authentication = (response as { authentication?: { idToken?: string } }).authentication;
    const params = (response as { params?: Record<string, string> }).params;
    const idToken = authentication?.idToken?.trim()
      || (typeof params?.id_token === 'string' ? params.id_token.trim() : '');

    // Code exchange may complete asynchronously; wait for id_token.
    if (!idToken) {
      if (params?.code && !authentication) return;
      console.warn('[AuthContext] Google login: id_token missing', {
        hasAuthentication: !!authentication,
        authenticationKeys: authentication ? Object.keys(authentication) : [],
        paramKeys: params ? Object.keys(params) : [],
      });
      releaseOAuthPrivacyBypass();
      return;
    }

    let cancelled = false;
    loginWithGoogleIdToken(idToken)
      .then((tokens) => {
        if (cancelled) return;
        setUser({ id: tokens.user_id!, email: tokens.email! });
        void AsyncStorage.removeItem(GUEST_MODE_KEY);
        void clearLimits();
      })
      .catch(e => console.warn('[AuthContext] Google login error', e))
      .finally(() => {
        if (!cancelled) {
          setTimeout(releaseOAuthPrivacyBypass, 300);
        }
      });

    return () => { cancelled = true; };
  }, [response]);

  const loginWithGoogle = useCallback(async () => {
    setPrivacyGateBypassed(true);
    const safetyTimer = setTimeout(releaseOAuthPrivacyBypass, OAUTH_PRIVACY_BYPASS_MS);
    try {
      await promptAsync();
    } catch {
      releaseOAuthPrivacyBypass();
    } finally {
      clearTimeout(safetyTimer);
    }
  }, [promptAsync]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, loginWithGoogle, loginAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID_RAW,
} from '@/config/googleAuth';
