import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal, ScrollView, Keyboard,
} from 'react-native';
import { AppInput } from '../design/components';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../ThemeContext';
import { Shadow } from '../theme';
import { useAuth } from '../providers/AuthContext';
import { forgotPassword, resetPassword } from '../services/authService';
import AppBottomSheet from '../components/AppBottomSheet';

type Tone = 'default' | 'success' | 'warning' | 'danger';

interface LocalSheetAction {
  label: string;
  onPress?: () => void;
}

interface SheetState {
  visible: boolean;
  title: string;
  message: string;
  icon: string;
  tone: Tone;
  actions: LocalSheetAction[];
}

export default function LoginBildschirm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { Colors, S, R } = useTheme();
  const C = Colors;
  const { user, loading: authLoading, login, register, loginWithGoogle, loginAsGuest } = useAuth();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [resetModal, setResetModal] = useState(false);
  const [resetSchritt, setResetSchritt] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPw, setResetNewPw] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [sheetState, setSheetState] = useState<SheetState>({
    visible: false,
    title: '',
    message: '',
    icon: 'information-circle-outline',
    tone: 'default',
    actions: [],
  });

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/(tabs)/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const openSheet = useCallback((config: Partial<Omit<SheetState, 'actions'>> & { actions?: LocalSheetAction[] }) => {
    setSheetState({
      visible: true,
      title: config.title || '',
      message: config.message || '',
      icon: config.icon || 'information-circle-outline',
      tone: (config.tone as Tone) || 'default',
      actions: (config.actions || []).map(action => ({
        ...action,
        onPress: () => {
          setSheetState(prev => ({ ...prev, visible: false }));
          action.onPress?.();
        },
      })),
    });
  }, []);

  const closeSheet = useCallback(() => {
    setSheetState(prev => ({ ...prev, visible: false }));
  }, []);

  const handleForgotPassword = async () => {
    const trimEmail = resetEmail.trim().toLowerCase();
    if (!trimEmail) {
      openSheet({
        title: 'E-Mail fehlt',
        message: 'Bitte E-Mail eingeben.',
        icon: 'mail-outline',
        tone: 'warning',
        actions: [{ label: 'Verstanden' }],
      });
      return;
    }
    setResetLoading(true);
    try {
      const res = await forgotPassword(trimEmail) as any;
      if (res?.reset_token) setResetToken(res.reset_token);
      setResetSchritt(2);
    } catch (e: any) {
      openSheet({
        title: 'Fehler',
        message: e.message,
        icon: 'alert-circle-outline',
        tone: 'danger',
        actions: [{ label: 'Schließen' }],
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim()) {
      openSheet({
        title: 'Token fehlt',
        message: 'Bitte den Reset-Code eingeben.',
        icon: 'key-outline',
        tone: 'warning',
        actions: [{ label: 'OK' }],
      });
      return;
    }
    if (resetNewPw.length < 6) {
      openSheet({
        title: 'Zu kurz',
        message: 'Mindestens 6 Zeichen.',
        icon: 'lock-closed-outline',
        tone: 'warning',
        actions: [{ label: 'OK' }],
      });
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(resetToken.trim(), resetNewPw);
      openSheet({
        title: 'Erfolg',
        message: 'Passwort wurde geändert. Bitte anmelden.',
        icon: 'checkmark-circle-outline',
        tone: 'success',
        actions: [{ label: 'Weiter', onPress: () => {} }],
      });
      setResetModal(false);
      setResetSchritt(1);
      setResetEmail('');
      setResetToken('');
      setResetNewPw('');
    } catch (e: any) {
      openSheet({
        title: 'Fehler',
        message: e.message,
        icon: 'alert-circle-outline',
        tone: 'danger',
        actions: [{ label: 'Schließen' }],
      });
    } finally {
      setResetLoading(false);
    }
  };

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
      if (tab === 'login') {
        await login(trimEmail, password);
      } else {
        await register(trimEmail, password);
      }
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
          <View style={[st.header, keyboardVisible && st.headerCompact]}>
            <View style={[st.logoBadge, { backgroundColor: C.primary }]}>
              <View style={st.logoFrame} />
              <Text style={st.logoPlane}>➤</Text>
              <Text style={st.logoSpark}>✦</Text>
            </View>
            <Text style={[st.title, { color: C.text }]}>BriefPilot</Text>
            <Text style={[st.subtitle, { color: C.textSecondary }]}>
              Ihre Dokumente. Immer im Griff.
            </Text>
          </View>

          <View style={[st.tabs, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            {(['login', 'register'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[st.tab, tab === t && { backgroundColor: C.primary }]}
                onPress={() => setTab(t)}
                activeOpacity={0.82}
              >
                <Text style={[st.tabText, { color: tab === t ? '#fff' : C.textSecondary }]}>
                  {t === 'login' ? 'Anmelden' : 'Registrieren'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
              onSubmitEditing={handleSubmit}
              style={{ marginTop: 12 }}
            />
            <TouchableOpacity
              style={[st.btn, { backgroundColor: loading ? C.primaryLight : C.primary }, Shadow.lg]}
              onPress={handleSubmit}
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
              onPress={loginWithGoogle}
              activeOpacity={0.88}
              style={[st.googleBtn, { borderColor: C.border, backgroundColor: C.bgCard }]}
            >
              <Text style={{ fontSize: 18 }}>G</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>
                Mit Google anmelden
              </Text>
            </TouchableOpacity>

            <View style={st.secondaryActions}>
              <TouchableOpacity
                onPress={loginAsGuest}
                activeOpacity={0.75}
                style={st.guestLinkWrap}
              >
                <Text style={{ fontSize: 13, color: C.textTertiary }}>
                  Ohne Anmeldung fortfahren →
                </Text>
              </TouchableOpacity>
            </View>

            {tab === 'login' && (
              <TouchableOpacity
                onPress={() => {
                  setResetModal(true);
                  setResetEmail(email);
                }}
                activeOpacity={0.75}
                style={{ marginTop: 14, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, color: C.primary }}>Passwort vergessen?</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[st.hint, { color: C.textTertiary }]}>
            Ihre Daten werden verschlüsselt gespeichert.
          </Text>
        </ScrollView>

        <Modal visible={resetModal} animationType="slide" transparent presentationStyle="overFullScreen">
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={() => setResetModal(false)}
          />
          <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 4 }}>
              Passwort zurücksetzen
            </Text>
            {resetSchritt === 1 ? (
              <>
                <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
                  Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Reset-Code.
                </Text>
                <AppInput
                  label="E-Mail"
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
                  {resetLoading ? <ActivityIndicator color="#fff" /> : <Text style={st.btnText}>Code anfordern</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
                  Reset-Code eingeben und neues Passwort festlegen.
                </Text>
                <AppInput
                  label="Reset-Code"
                  icon="key"
                  placeholder="Token eingeben"
                  value={resetToken}
                  onChangeText={setResetToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AppInput
                  label="Neues Passwort"
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
                  {resetLoading ? <ActivityIndicator color="#fff" /> : <Text style={st.btnText}>Passwort ändern</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setResetSchritt(1)} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: C.textTertiary }}>← Zurück</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Modal>

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

const st = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  scrollContentCentered: { justifyContent: 'center', paddingTop: 28 },
  scrollContentKeyboard: { justifyContent: 'flex-start', paddingTop: 20 },
  header: { alignItems: 'center', marginBottom: 28 },
  headerCompact: { marginBottom: 18 },
  logoBadge: {
    width: 74, height: 74, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', ...Shadow.lg,
  },
  logoFrame: {
    position: 'absolute', width: 34, height: 34, borderRadius: 10, borderWidth: 4,
    borderColor: '#fff', transform: [{ rotate: '-22deg' }], left: 18, top: 22,
  },
  logoPlane: {
    position: 'absolute', right: 8, top: 7, color: '#fff', fontSize: 29,
    fontWeight: '800', transform: [{ rotate: '-18deg' }],
  },
  logoSpark: { position: 'absolute', left: 29, top: 31, color: '#FFB11A', fontSize: 16, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '800', marginTop: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 6, lineHeight: 20, textAlign: 'center' },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, borderWidth: 1, marginBottom: 18 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '700' },
  form: { borderWidth: 1, borderRadius: 20, padding: 18 },
  btn: { marginTop: 18, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 16, paddingVertical: 14, marginTop: 12, gap: 10,
  },
  secondaryActions: { marginTop: 20, paddingTop: 2, alignItems: 'center' },
  guestLinkWrap: { paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center' },
  hint: { marginTop: 16, textAlign: 'center', fontSize: 12 },
});
