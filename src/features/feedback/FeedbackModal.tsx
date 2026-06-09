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

const SEVERITY_OPTIONS: { id: Severity; emoji: string; labelKey: string; descKey: string }[] = [
  { id: 'fehler',       emoji: '🔴', labelKey: 'feedback.severity.error',       descKey: 'feedback.severity.error_desc' },
  { id: 'unklar',       emoji: '🟡', labelKey: 'feedback.severity.unclear',     descKey: 'feedback.severity.unclear_desc' },
  { id: 'verbesserung', emoji: '🟢', labelKey: 'feedback.severity.improvement', descKey: 'feedback.severity.improvement_desc' },
  { id: 'lob',          emoji: '💙', labelKey: 'feedback.severity.praise',      descKey: 'feedback.severity.praise_desc' },
];

const SCREENS = [
  'feedback.screen.home',
  'feedback.screen.camera',
  'feedback.screen.analysis',
  'feedback.screen.actions',
  'feedback.screen.document',
  'feedback.screen.export',
  'feedback.screen.settings',
  'feedback.screen.other',
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
      Alert.alert(t('feedback.error.choose_category'));
      return;
    }
    if (text.trim().length < 10) {
      Alert.alert(t('feedback.error.min_length'));
      return;
    }

    setSending(true);
    const summary = await BetaAnalytics.getSessionSummary();
    const sevOpt  = SEVERITY_OPTIONS.find(s => s.id === severity)!;
    const version = Constants.expoConfig?.version ?? '?';

    const screenLabel = screen.startsWith('feedback.screen.') ? t(screen) : screen;
    const subject = encodeURIComponent(
      `[BriefPilot ${sevOpt.emoji} ${t(sevOpt.labelKey)}] ${screenLabel || t('feedback.screen.general')} — v${version}`
    );

    const body = encodeURIComponent([
      `${t('feedback.field.category')}: ${sevOpt.emoji} ${t(sevOpt.labelKey)}`,
      `${t('feedback.field.screen')}: ${screenLabel || '—'}`,
      '',
      `${t('feedback.field.feedback')}:`,
      text.trim(),
      '',
      email.trim() ? `${t('feedback.field.reply_to')}: ${email.trim()}` : '',
      '',
      `─── ${t('feedback.technical_info')} ───`,
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
        t('feedback.error.mail_app_title'),
        t('feedback.error.mail_app_body'),
      );
    }
  }, [severity, screen, text, email, handleClose, t]);

  const C = Colors;

  return (
    <AppSheet
      visible={visible}
      onClose={handleClose}
      title={t('feedback.title')}
      subtitle={t('feedback.subtitle')}
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
            {t('feedback.field.category').toUpperCase()}
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
                      {t(opt.labelKey)}
                    </Text>
                    <Text style={{ color: C.textTertiary, fontSize: fs(11) }}>{t(opt.descKey)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Screen selector */}
        <View>
          <Text style={[st.sectionLabel, { color: C.textSecondary, fontSize: fs(11) }]}>
            {t('feedback.field.screen').toUpperCase()}
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
                    {t(s)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Text input */}
        <View>
          <Text style={[st.sectionLabel, { color: C.textSecondary, fontSize: fs(11) }]}>
            {t('feedback.field.your_feedback').toUpperCase()}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('feedback.placeholder.message')}
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
            {t('feedback.character_count', { n: text.length })}
          </Text>
        </View>

        {/* Optional email */}
        <View>
          <Text style={[st.sectionLabel, { color: C.textSecondary, fontSize: fs(11) }]}>
            {t('feedback.field.reply_optional').toUpperCase()}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('feedback.placeholder.email')}
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
          {t('feedback.privacy_note')}
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
