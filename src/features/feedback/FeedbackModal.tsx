import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Linking, StyleSheet, Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '@/ThemeContext';
import AppSheet from '@/design/components/AppSheet';
import { BetaAnalytics } from '@/services/BetaAnalytics';
import { useT } from '@/hooks/useT';

// ── Types ─────────────────────────────────────────────────────────────────────

type Severity = 'fehler' | 'unklar' | 'verbesserung' | 'lob';

const SEVERITY_OPTIONS: { id: Severity; emoji: string; label: string; desc: string }[] = [
  { id: 'fehler',       emoji: '🔴', label: 'Fehler',       desc: 'Etwas funktioniert nicht' },
  { id: 'unklar',       emoji: '🟡', label: 'Unklarheit',   desc: 'Ich verstehe etwas nicht' },
  { id: 'verbesserung', emoji: '🟢', label: 'Verbesserung', desc: 'Könnte besser sein' },
  { id: 'lob',          emoji: '💙', label: 'Lob',          desc: 'Das finde ich gut' },
];

const SCREENS = [
  'Home', 'Kamera', 'Analyse', 'Aktionen',
  'Dokument', 'Export', 'Einstellungen', 'Sonstiges',
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  /** Pre-select a screen name (e.g. from the current route) */
  initialScreen?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedbackModal({ visible, onClose, initialScreen }: FeedbackModalProps) {
  const { Colors, fs } = useTheme();
  const { t } = useT();

  const [severity,  setSeverity]  = useState<Severity | null>(null);
  const [screen,    setScreen]    = useState<string>(initialScreen ?? '');
  const [text,      setText]      = useState('');
  const [email,     setEmail]     = useState('');
  const [sending,   setSending]   = useState(false);

  const reset = useCallback(() => {
    setSeverity(null);
    setScreen(initialScreen ?? '');
    setText('');
    setEmail('');
    setSending(false);
  }, [initialScreen]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSend = useCallback(async () => {
    if (!severity) {
      Alert.alert('Bitte wähle eine Kategorie aus.');
      return;
    }
    if (text.trim().length < 10) {
      Alert.alert('Bitte schreibe mindestens einen kurzen Satz (10 Zeichen).');
      return;
    }

    setSending(true);
    const summary = await BetaAnalytics.getSessionSummary();
    const sevOpt  = SEVERITY_OPTIONS.find(s => s.id === severity)!;
    const version = Constants.expoConfig?.version ?? '?';

    const subject = encodeURIComponent(
      `[BriefPilot ${sevOpt.emoji} ${sevOpt.label}] ${screen || 'Allgemein'} — v${version}`
    );

    const body = encodeURIComponent([
      `Kategorie: ${sevOpt.emoji} ${sevOpt.label}`,
      `Bildschirm: ${screen || '—'}`,
      '',
      'Feedback:',
      text.trim(),
      '',
      email.trim() ? `Antwort an: ${email.trim()}` : '',
      '',
      '─── Technische Infos (keine persönlichen Daten) ───',
      summary,
    ].filter(l => l !== null).join('\n'));

    const mailto = `mailto:feedback@briefpilot.de?subject=${subject}&body=${body}`;

    try {
      await Linking.openURL(mailto);
      await BetaAnalytics.trackEvent('feedback_submitted');
      setSending(false);
      handleClose();
    } catch {
      setSending(false);
      Alert.alert(
        'E-Mail-App nicht verfügbar',
        'Bitte sende dein Feedback direkt an feedback@briefpilot.de',
      );
    }
  }, [severity, screen, text, email, handleClose]);

  const C = Colors;

  return (
    <AppSheet
      visible={visible}
      onClose={handleClose}
      title="Feedback"
      subtitle="Deine Meinung hilft uns, BriefPilot besser zu machen."
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Severity */}
        <View>
          <Text style={[st.sectionLabel, { color: C.textSecondary, fontSize: fs(11) }]}>
            KATEGORIE
          </Text>
          <View style={st.pills}>
            {SEVERITY_OPTIONS.map(opt => {
              const active = severity === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setSeverity(opt.id)}
                  activeOpacity={0.75}
                  style={[
                    st.pill,
                    {
                      backgroundColor: active ? C.primaryLight : C.bgInput,
                      borderColor: active ? C.primary : C.borderLight,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                  <View>
                    <Text style={[st.pillLabel, { color: active ? C.primaryDark : C.text, fontSize: fs(13) }]}>
                      {opt.label}
                    </Text>
                    <Text style={{ color: C.textTertiary, fontSize: fs(11) }}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Screen selector */}
        <View>
          <Text style={[st.sectionLabel, { color: C.textSecondary, fontSize: fs(11) }]}>
            BILDSCHIRM
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {SCREENS.map(s => {
              const active = screen === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setScreen(s)}
                  activeOpacity={0.75}
                  style={[
                    st.screenChip,
                    {
                      backgroundColor: active ? C.primary : C.bgInput,
                      borderColor: active ? C.primary : C.borderLight,
                    },
                  ]}
                >
                  <Text style={[st.screenChipText, { color: active ? '#fff' : C.text, fontSize: fs(12) }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Text input */}
        <View>
          <Text style={[st.sectionLabel, { color: C.textSecondary, fontSize: fs(11) }]}>
            DEIN FEEDBACK
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Was ist passiert? Was hast du erwartet?"
            placeholderTextColor={C.textTertiary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={[
              st.textarea,
              {
                color: C.text,
                backgroundColor: C.bgInput,
                borderColor: C.borderLight,
                fontSize: fs(14),
                minHeight: 110,
              },
            ]}
          />
          <Text style={{ color: C.textTertiary, fontSize: fs(11), marginTop: 4, textAlign: 'right' }}>
            {text.length} Zeichen
          </Text>
        </View>

        {/* Optional email */}
        <View>
          <Text style={[st.sectionLabel, { color: C.textSecondary, fontSize: fs(11) }]}>
            ANTWORT AN (OPTIONAL)
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="deine@email.de"
            placeholderTextColor={C.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              st.input,
              { color: C.text, backgroundColor: C.bgInput, borderColor: C.borderLight, fontSize: fs(14) },
            ]}
          />
        </View>

        {/* Privacy note */}
        <Text style={[st.privacy, { color: C.textTertiary, fontSize: fs(11) }]}>
          Beim Senden werden technische Infos (App-Version, OS) mitgeschickt — kein Dokumentinhalt, keine persönlichen Daten.
        </Text>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending}
          activeOpacity={0.8}
          style={[
            st.sendBtn,
            { backgroundColor: sending ? C.border : C.primary },
          ]}
        >
          <Text style={[st.sendBtnText, { fontSize: fs(15) }]}>
            {sending ? t('feedback.opening_mail') : t('feedback.send')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </AppSheet>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  sectionLabel: { fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  pills:        { gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  pillLabel:    { fontWeight: '700' },
  screenChip: {
    borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  screenChipText: { fontWeight: '600' },
  textarea: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  privacy: { lineHeight: 16, textAlign: 'center' },
  sendBtn: {
    borderRadius: 14, alignItems: 'center',
    paddingVertical: 16, marginTop: 4,
  },
  sendBtnText: { color: '#fff', fontWeight: '800', letterSpacing: -0.2 },
});
