/**
 * Sifre sifirlama modal'i — bottom-sheet sunum.
 *
 * Iki adimli:
 *  1. E-Mail -> token iste
 *  2. Token + yeni sifre -> sifre degistir
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppInput } from '@/design/components';
import { useTheme } from '@/ThemeContext';
import { authStyles as st } from '@/features/auth/styles';
import { useT } from '@/hooks/useT';
import type { UsePasswordResetResult } from '@/features/auth/usePasswordReset';

interface Props {
  reset: UsePasswordResetResult;
}

export default function PasswordResetModal({ reset }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  const {
    resetModal, setResetModal,
    resetSchritt, setResetSchritt,
    resetEmail, setResetEmail,
    resetToken, setResetToken,
    resetNewPw, setResetNewPw,
    resetLoading,
    handleForgotPassword,
    handleResetPassword,
  } = reset;

  return (
    <Modal visible={resetModal} animationType="fade" transparent presentationStyle="overFullScreen">
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        onPress={() => setResetModal(false)}
      />
      <View
        style={{
          backgroundColor: C.bgCard,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: 40,
        }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 4 }}>
          {T('auth.reset_title')}
        </Text>

        {resetSchritt === 1 ? (
          <>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
              {T('auth.reset_body1')}
            </Text>
            <AppInput
              label={T('auth.email_label')}
              icon="envelope"
              placeholder="name@beispiel.de"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[st.btn, { backgroundColor: resetLoading ? C.primaryLight : C.primary, marginTop: 16 }]}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              {resetLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={st.btnText}>{T('auth.reset_request')}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
              {T('auth.reset_body2')}
            </Text>
            <AppInput
              label={T('auth.reset_code_label')}
              icon="key"
              placeholder="Token eingeben"
              value={resetToken}
              onChangeText={setResetToken}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AppInput
              label={T('auth.password_label')}
              secure
              placeholder="••••••••"
              value={resetNewPw}
              onChangeText={setResetNewPw}
              style={{ marginTop: 12 }}
            />
            <TouchableOpacity
              style={[st.btn, { backgroundColor: resetLoading ? C.primaryLight : C.primary, marginTop: 16 }]}
              onPress={handleResetPassword}
              disabled={resetLoading}
            >
              {resetLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={st.btnText}>{T('auth.reset_change')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setResetSchritt(1)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: C.textTertiary }}>← {T('common.back')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}
