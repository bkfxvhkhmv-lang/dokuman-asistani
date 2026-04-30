/**
 * Login / Register formu — email + sifre + submit + Google + Misafir.
 *
 * Sifre sifirlama linki `tab === 'login'` iken gosterilir.
 */
import React from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { AppInput } from '@/design/components';
import { useTheme } from '@/ThemeContext';
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

  return (
    <View style={[st.form, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      <AppInput
        label="E-Mail"
        icon="envelope"
        placeholder="name@beispiel.de"
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
        placeholder="••••••••"
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
            {tab === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onGoogle}
        activeOpacity={0.88}
        style={[st.googleBtn, { borderColor: C.border, backgroundColor: C.bgCard }]}
      >
        <Text style={{ fontSize: 18 }}>G</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>
          Mit Google anmelden
        </Text>
      </TouchableOpacity>

      <View style={st.secondaryActions}>
        <TouchableOpacity onPress={onGuest} activeOpacity={0.75} style={st.guestLinkWrap}>
          <Text style={{ fontSize: 13, color: C.textTertiary }}>
            Ohne Anmeldung fortfahren →
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'login' && (
        <TouchableOpacity
          onPress={onForgotPassword}
          activeOpacity={0.75}
          style={{ marginTop: 14, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, color: C.primary }}>Passwort vergessen?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
