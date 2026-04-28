import { useState, useCallback } from 'react';
import {
  loginUser,
  registerUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  getStoredUser,
  clearTokens,
} from '../services/authService';

export type AuthFlowStatus = 'idle' | 'loading' | 'success' | 'error';

export function useAuthFlow() {
  const [status, setStatus] = useState<AuthFlowStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setStatus('loading');
    setError(null);
    try {
      const result = await fn();
      setStatus('success');
      return result;
    } catch (e: any) {
      setError(e?.message ?? 'Fehler aufgetreten');
      setStatus('error');
      return null;
    }
  }, []);

  const login = useCallback((email: string, password: string) =>
    run(() => loginUser(email, password)), [run]);

  const register = useCallback((email: string, password: string) =>
    run(() => registerUser(email, password)), [run]);

  const logout = useCallback(() =>
    run(() => logoutUser()), [run]);

  const sendPasswordReset = useCallback((email: string) =>
    run(() => forgotPassword(email)), [run]);

  const confirmPasswordReset = useCallback((token: string, newPassword: string) =>
    run(() => resetPassword(token, newPassword)), [run]);

  const getUser = useCallback(() =>
    run(() => getStoredUser()), [run]);

  const clearSession = useCallback(() =>
    run(() => clearTokens()), [run]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    error,
    login,
    register,
    logout,
    sendPasswordReset,
    confirmPasswordReset,
    getUser,
    clearSession,
    reset,
  };
}
