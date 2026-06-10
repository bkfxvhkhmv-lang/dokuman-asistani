/**
 * Login ana ekranı — orkestratör.
 * Önceki `screens/LoginBildschirm.tsx` içeriği; route girişi artık `features/auth`.
 */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '@/ThemeContext';
import { useAuth } from '@/providers/AuthContext';
import AppBottomSheet from '@/components/AppBottomSheet';

import BrandHeader from '@/features/auth/BrandHeader';
import AuthTabs, { type AuthTab } from '@/features/auth/AuthTabs';
import AuthForm from '@/features/auth/AuthForm';
import PasswordResetModal from '@/features/auth/PasswordResetModal';
import { useAuthSheet } from '@/features/auth/useAuthSheet';
import { usePasswordReset } from '@/features/auth/usePasswordReset';
import { authStyles as st } from '@/features/auth/styles';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { Colors: C } = useTheme();
  const { user, loading: authLoading, login, register, loginWithGoogle, loginAsGuest } = useAuth();

  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const { sheetState, openSheet, closeSheet } = useAuthSheet();
  const reset = usePasswordReset(openSheet);

  useEffect(() => {
    if (!authLoading && user && !user.isGuest) {
      router.replace('/(tabs)/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleSubmit = async () => {
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail || !password) {
      openSheet({
        title: 'Fehlende Angaben',
        message: 'Bitte E-Mail und Passwort eingeben.',
        icon: 'person-outline',
        tone: 'warning',
        actions: [{ label: 'Verstanden' }],
      });
      return;
    }
    if (password.length < 6) {
      openSheet({
        title: 'Passwort zu kurz',
        message: 'Mindestens 6 Zeichen erforderlich.',
        icon: 'lock-closed-outline',
        tone: 'warning',
        actions: [{ label: 'OK' }],
      });
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') await login(trimEmail, password);
      else await register(trimEmail, password);
    } catch (e: any) {
      openSheet({
        title: 'Fehler',
        message: e.message || 'Ein unbekannter Fehler ist aufgetreten.',
        icon: 'alert-circle-outline',
        tone: 'danger',
        actions: [{ label: 'Schließen' }],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={st.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 12 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentContainerStyle={[
            st.scrollContent,
            keyboardVisible ? st.scrollContentKeyboard : st.scrollContentCentered,
            { paddingBottom: insets.bottom + (keyboardVisible ? 28 : 20) },
          ]}
        >
          <BrandHeader compact={keyboardVisible} />

          <AuthTabs active={tab} onChange={setTab} />

          <AuthForm
            tab={tab}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            loading={loading}
            onSubmit={handleSubmit}
            onGoogle={loginWithGoogle}
            onGuest={() => {
              loginAsGuest();
              router.replace('/(tabs)/');
            }}
            onForgotPassword={() => {
              reset.setResetModal(true);
              reset.setResetEmail(email);
            }}
          />

          <Text style={[st.hint, { color: C.textTertiary }]}>
            Sicher verarbeitet · Du behältst die Kontrolle über deine Dokumente.
          </Text>
        </ScrollView>

        <PasswordResetModal reset={reset} />

        <AppBottomSheet
          visible={sheetState.visible}
          title={sheetState.title}
          message={sheetState.message}
          icon={sheetState.icon}
          tone={sheetState.tone}
          actions={sheetState.actions as any}
          onClose={closeSheet}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
