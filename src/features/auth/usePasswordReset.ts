/**
 * Sifre sifirlama akisinin state ve handler'larini yoneten hook.
 *
 * Iki adimli akis:
 *   1. E-Mail gir -> sunucudan token iste
 *   2. Token + yeni sifre gir -> sifre degistir
 *
 * Hatalar AuthSheet ile kullaniciya gosterilir.
 */
import { useCallback, useState } from 'react';
import { forgotPassword, resetPassword } from '@/services/authService';
import type { UseAuthSheetResult } from '@/features/auth/useAuthSheet';

export interface UsePasswordResetResult {
  resetModal:    boolean;
  setResetModal: (v: boolean) => void;
  resetSchritt:  number;
  setResetSchritt: (v: number) => void;
  resetEmail:    string;  setResetEmail:    (v: string) => void;
  resetToken:    string;  setResetToken:    (v: string) => void;
  resetNewPw:    string;  setResetNewPw:    (v: string) => void;
  resetLoading:  boolean;

  handleForgotPassword: () => Promise<void>;
  handleResetPassword:  () => Promise<void>;
}

export function usePasswordReset(
  openSheet: UseAuthSheetResult['openSheet'],
): UsePasswordResetResult {
  const [resetModal, setResetModal]     = useState(false);
  const [resetSchritt, setResetSchritt] = useState(1);
  const [resetEmail, setResetEmail]     = useState('');
  const [resetToken, setResetToken]     = useState('');
  const [resetNewPw, setResetNewPw]     = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = useCallback(async () => {
    const trimEmail = resetEmail.trim().toLowerCase();
    if (!trimEmail) {
      openSheet({
        title:   'E-Mail fehlt',
        message: 'Bitte E-Mail eingeben.',
        icon:    'mail-outline',
        tone:    'warning',
        actions: [{ label: 'Verstanden' }],
      });
      return;
    }
    setResetLoading(true);
    try {
      const res = await forgotPassword(trimEmail) as any;
      // Bazi backend'lerde test token doner — varsa otomatik doldur.
      if (res?.reset_token) setResetToken(res.reset_token);
      setResetSchritt(2);
    } catch (e: any) {
      openSheet({
        title:   'Fehler',
        message: e.message,
        icon:    'alert-circle-outline',
        tone:    'danger',
        actions: [{ label: 'Schließen' }],
      });
    } finally {
      setResetLoading(false);
    }
  }, [resetEmail, openSheet]);

  const handleResetPassword = useCallback(async () => {
    if (!resetToken.trim()) {
      openSheet({
        title:   'Token fehlt',
        message: 'Bitte den Reset-Code eingeben.',
        icon:    'key-outline',
        tone:    'warning',
        actions: [{ label: 'OK' }],
      });
      return;
    }
    if (resetNewPw.length < 6) {
      openSheet({
        title:   'Zu kurz',
        message: 'Mindestens 6 Zeichen.',
        icon:    'lock-closed-outline',
        tone:    'warning',
        actions: [{ label: 'OK' }],
      });
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(resetToken.trim(), resetNewPw);
      openSheet({
        title:   'Erfolg',
        message: 'Passwort wurde geändert. Bitte anmelden.',
        icon:    'checkmark-circle-outline',
        tone:    'success',
        actions: [{ label: 'Weiter' }],
      });
      setResetModal(false);
      setResetSchritt(1);
      setResetEmail('');
      setResetToken('');
      setResetNewPw('');
    } catch (e: any) {
      openSheet({
        title:   'Fehler',
        message: e.message,
        icon:    'alert-circle-outline',
        tone:    'danger',
        actions: [{ label: 'Schließen' }],
      });
    } finally {
      setResetLoading(false);
    }
  }, [resetToken, resetNewPw, openSheet]);

  return {
    resetModal, setResetModal,
    resetSchritt, setResetSchritt,
    resetEmail, setResetEmail,
    resetToken, setResetToken,
    resetNewPw, setResetNewPw,
    resetLoading,
    handleForgotPassword,
    handleResetPassword,
  };
}
