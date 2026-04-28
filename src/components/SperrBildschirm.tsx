import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
// Graceful import — falls back silently if package is not installed
let LocalAuthentication: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LocalAuthentication = require('expo-local-authentication');
} catch { /* package not installed — biometric disabled */ }
import * as Haptics from 'expo-haptics';
import Icon from './Icon';
import { useTheme } from '../ThemeContext';

interface SperrBildschirmProps {
  visible: boolean;
  onEntsperrt: () => void;
}

export default function SperrBildschirm({ visible, onEntsperrt }: SperrBildschirmProps) {
  const { Colors: C } = useTheme();
  const [fehler, setFehler] = useState(false);
  const [unterstuetzt, setUnterstuetzt] = useState(true);

  useEffect(() => {
    if (visible) {
      setFehler(false);
      authentifizieren();
    }
  }, [visible]);

  async function authentifizieren() {
    if (!LocalAuthentication) {
      // Package not installed — unlock immediately (dev mode fallback)
      onEntsperrt();
      return;
    }
    try {
      const hat = await LocalAuthentication.hasHardwareAsync();
      const registriert = await LocalAuthentication.isEnrolledAsync();
      if (!hat || !registriert) {
        setUnterstuetzt(false);
        onEntsperrt(); // no hardware → let user through
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'BriefPilot entsperren',
        fallbackLabel: 'PIN verwenden',
        cancelLabel: '',
        disableDeviceFallback: false,
      });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onEntsperrt();
      } else {
        setFehler(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setUnterstuetzt(false);
      onEntsperrt(); // graceful fallback
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={st.container}>
        <View style={st.iconWrap}>
          <Icon name="lock-closed" size={44} color="rgba(255,255,255,0.9)" weight="fill" />
        </View>
        <Text style={st.titel}>BriefPilot</Text>
        <Text style={st.sub}>Ihre Dokumente sind geschützt</Text>
        {!unterstuetzt && (
          <Text style={st.hinweis}>
            Face ID / PIN nicht verfügbar.{'\n'}Bitte richten Sie eine Bildschirmsperre ein.
          </Text>
        )}
        {fehler && (
          <Text style={[st.hinweis, { color: C.danger }]}>Authentifizierung fehlgeschlagen.</Text>
        )}
        <TouchableOpacity
          style={st.btn}
          onPress={authentifizieren}
          accessibilityRole="button"
          accessibilityLabel={unterstuetzt ? 'BriefPilot entsperren' : 'Erneut versuchen'}
        >
          <Text style={st.btnText}>
            {unterstuetzt ? '🔓  Entsperren' : '↩  Erneut versuchen'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(83,74,183,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  titel: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 40, textAlign: 'center' },
  hinweis: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: { backgroundColor: '#534AB7', borderRadius: 18, paddingHorizontal: 36, paddingVertical: 16 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
