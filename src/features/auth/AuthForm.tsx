/**
 * Login / Register formu — email + sifre + submit + Google + Misafir.
 *
 * Sifre sifirlama linki `tab === 'login'` iken gosterilir.
 */
import React from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { AppInput } from '@/design/components';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { Shadow } from '@/theme';
import { authStyles as st } from '@/features/auth/styles';
import type { AuthTab } from '@/features/auth/AuthTabs';

interface Props {
  tab: AuthTab;
  email: string;        setEmail: (v: string) => void;
  password: string;     setPassword: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  onGoogle: () => void;
  onGuest: () => void;
  onForgotPassword: () => void;
}

export default function AuthForm({
  tab, email, setEmail, password, setPassword,
  loading, onSubmit, onGoogle, onGuest, onForgotPassword,
}: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();

  return (
    <View style={[st.form, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      <AppInput
        label="E-Mail"
        icon="envelope"
        placeholder={T('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
      />
      <AppInput
        label="Passwort"
        secure
        placeholder={T('auth.password')}
        value={password}
        onChangeText={setPassword}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        style={{ marginTop: 12 }}
      />

      <TouchableOpacity
        style={[st.btn, { backgroundColor: loading ? C.primaryLight : C.primary }, Shadow.lg]}
        onPress={onSubmit}
        disabled={loading}
        activeOpacity={0.88}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={st.btnText}>
            {tab === 'login' ? T('auth.submit_login') : T('auth.submit_register')}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onGoogle}
        activeOpacity={0.82}
        style={[st.googleBtn, { borderColor: C.borderLight, backgroundColor: C.bgCard }]}
      >
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff', lineHeight: 13 }}>G</Text>
        </View>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.text, letterSpacing: -0.1 }}>
          {T('auth.google')}
        </Text>
      </TouchableOpacity>

      <View style={st.secondaryActions}>
        <TouchableOpacity onPress={onGuest} activeOpacity={0.75} style={st.guestLinkWrap}>
          <Text style={{ fontSize: 13, color: C.textSecondary }}>
            Ohne Anmeldung fortfahren →
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'login' && (
        <TouchableOpacity
          onPress={onForgotPassword}
          activeOpacity={0.75}
          style={{ marginTop: 10, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, color: C.primary }}>Passwort vergessen?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
