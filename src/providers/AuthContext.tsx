import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  loginUser, registerUser, logoutUser,
  getStoredUser, setSessionExpiredHandler,
} from '../services/authService';

WebBrowser.maybeCompleteAuthSession();

const ANDROID_CLIENT_ID = '788836666259-5s3jv9qk0nhf23vbnrqal0cjm2eu6r98.apps.googleusercontent.com';
const WEB_CLIENT_ID     = '788836666259-vp0eqcpbped3q86as7bpdheq2f24u4cc.apps.googleusercontent.com';

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
    getStoredUser()
      .then(u => setUser(u as AuthUser | null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    setSessionExpiredHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginUser(email, password) as any;
    setUser({ id: data.user_id, email: data.email });
    return data;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const data = await registerUser(email, password) as any;
    setUser({ id: data.user_id, email: data.email });
    return data;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const loginAsGuest = useCallback(() => {
    setUser({ id: 'guest', email: 'gast@briefpilot.de', name: 'Gast', isGuest: true });
  }, []);

  const [, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    webClientId:     WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const { authentication } = response as any;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${authentication.accessToken}` },
      signal: controller.signal,
    })
      .then(r => { if (!r.ok) throw new Error(`Google API ${r.status}`); return r.json(); })
      .then((googleUser: any) => {
        setUser({ id: googleUser.id, email: googleUser.email, name: googleUser.name, photo: googleUser.picture });
      })
      .catch(e => console.warn('[AuthContext] Google login error', e))
      .finally(() => clearTimeout(timer));
  }, [response]);

  const loginWithGoogle = useCallback(async () => {
    await promptAsync();
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

export const GOOGLE_ANDROID_CLIENT_ID = ANDROID_CLIENT_ID;
export const GOOGLE_WEB_CLIENT_ID     = WEB_CLIENT_ID;
