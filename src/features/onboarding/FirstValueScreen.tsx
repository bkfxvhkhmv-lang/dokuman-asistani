/**
 * Aktivierung: ilk belgenin aksiyonla sonuçlanması — onboarding’in gerçek kapanışı.
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import { useTheme } from '@/ThemeContext';
import ActionCard from '@/design/components/ActionCard';
import SummaryCard from '@/design/components/SummaryCard';
import { deriveDocumentTodoLines } from '@/utils/deriveDocumentTodoLines';
import { formatBetrag, formatFrist, getTageText } from '@/utils/formatters';
import { addToLucideCalendar } from '@/utils/calendar';
import { buildReminderSuggestions, scheduleReminder } from '@/services/SmartRemindersService';
import {
  requestNotificationPermission,
  setupNotificationCategories,
} from '@/services/SmartNotificationsService';
import {
  ONBOARDING_DONE_KEY,
  setAutoNotificationBlocked,
} from '@/product/onboardingStorage';

export default function FirstValueScreen() {
  const { dokId } = useLocalSearchParams<{ dokId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { Colors: C } = useTheme();
  const { state } = useStore();
  const [busy, setBusy] = useState<'cal' | 'rem' | 'done' | null>(null);
  const [notifAsked, setNotifAsked] = useState(false);

  const dok = useMemo(
    () => state.dokumente.find(d => d.id === dokId),
    [state.dokumente, dokId],
  );

  const lines = dok ? deriveDocumentTodoLines(dok) : [];
  const summary = dok?.kurzfassung?.trim() ?? dok?.zusammenfassung?.trim() ?? '';

  const titleLine = useMemo(() => {
    if (lines[0]) return lines[0];
    if (dok?.betrag != null) {
      const b = formatBetrag(dok.betrag, dok.waehrung || '€');
      return b ? `${b} bezahlen` : 'Betrag prüfen';
    }
    return 'Beleg gesichert — weiter im Detail möglich.';
  }, [lines, dok?.betrag, dok?.waehrung]);

  const fristZeile = dok?.frist
    ? `${formatFrist(dok.frist)}${getTageText(dok.frist) ? ` · ${getTageText(dok.frist)}` : ''}`
    : null;

  const finishActivation = useCallback(async () => {
    setBusy('done');
    await setAutoNotificationBlocked(false);
    await AsyncStorage.multiSet([[ONBOARDING_DONE_KEY, 'true']]);
    router.replace('/(tabs)');
  }, [router]);

  const handleRemind = useCallback(async () => {
    if (!dok) return;
    setBusy('rem');
    await requestNotificationPermission();
    const suggestions = buildReminderSuggestions(dok);
    const first = suggestions[0];
    if (!first) {
      Alert.alert(
        'Keine passende Erinnerung',
        'Für diesen Beleg konnte kein konkreter Zeitpunkt abgeleitet werden — im Detail kannst du Frist und Betrag ergänzen.',
      );
    } else {
      await scheduleReminder(dok, first);
    }
    setBusy(null);
    setNotifAsked(true);
  }, [dok]);

  const handleCalendar = useCallback(async () => {
    if (!dok?.frist) return;
    setBusy('cal');
    await addToLucideCalendar(dok);
    setBusy(null);
  }, [dok]);

  const handleEnableNotifAndFinish = useCallback(async () => {
    await setupNotificationCategories();
    await requestNotificationPermission();
    await finishActivation();
  }, [finishActivation]);

  if (!dokId) {
    router.replace('/(tabs)');
    return null;
  }

  if (!dok) {
    return (
      <View style={[st.center, { backgroundColor: C.bg, paddingTop: insets.top }]}>
        <ActivityIndicator color={C.primary} />
        <Text style={{ color: C.textSecondary, marginTop: 12 }}>Lädt …</Text>
      </View>
    );
  }

  return (
    <View style={[st.root, { backgroundColor: C.bg }]}>
      <TouchableOpacity
        onPress={finishActivation}
        disabled={busy === 'done'}
        accessibilityLabel="Überspringen"
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}
        style={{ position: 'absolute', top: insets.top + 12, right: 22, zIndex: 10, padding: 8 }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.textSecondary }}>Überspringen</Text>
      </TouchableOpacity>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 22,
        }}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={[st.kicker, { color: C.primary }]}>JETZT BIST DU DRAN</Text>
      <Text style={[st.headline, { color: C.text }]}>Dein nächster Schritt</Text>
      <Text style={[st.subhead, { color: C.textSecondary }]}>
        Kurz gesagt, was diese Unterlage für dich bedeutet:
      </Text>

      <ActionCard
        title={titleLine}
        subtitle={fristZeile}
        primaryAction={
          dok
            ? {
                label: busy === 'rem' ? '…' : 'Erinnerung setzen',
                onPress: handleRemind,
              }
            : undefined
        }
        secondaryAction={
          dok?.frist
            ? {
                label: busy === 'cal' ? '…' : 'Kalender',
                onPress: handleCalendar,
              }
            : undefined
        }
      />
      {!!summary && <SummaryCard text={summary} maxLines={6} />}

      <Text style={[st.hint, { color: C.textTertiary }]}>
        Du kannst das später jederzeit im Dokument ändern.
      </Text>

      {!notifAsked ? (
        <View style={[st.noteBox, { backgroundColor: C.primaryLight, borderColor: `${C.primary}44` }]}>
          <Text style={[st.noteTitle, { color: C.primaryDark }]}>Erinnerungen erlauben?</Text>
          <Text style={[st.noteBody, { color: C.textSecondary }]}>
            Dann können wir dich an Fristen und offene Beträge erinnern — jederzeit in den Einstellungen wieder aus.
          </Text>
          <TouchableOpacity
            style={[st.primary, { backgroundColor: C.primaryDark, marginTop: 12 }]}
            onPress={handleEnableNotifAndFinish}
            disabled={busy === 'done'}
          >
            <Text style={st.primaryTxt}>Ja, Benachrichtigungen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 12 }} onPress={finishActivation} disabled={busy === 'done'}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.textSecondary }}>Später entscheiden</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[st.primary, { backgroundColor: C.success }]}
          onPress={finishActivation}
          disabled={busy === 'done'}
        >
          <Text style={st.primaryTxt}>Weiter zur Übersicht</Text>
        </TouchableOpacity>
      )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root:    { flex: 1 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  kicker:  { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 8 },
  headline:{ fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginBottom: 10 },
  subhead: { fontSize: 15, lineHeight: 22, marginBottom: 22 },
  card:    { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 14 },
  row:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot:     { fontSize: 18, fontWeight: '900', marginTop: -2 },
  actionLine:{ fontSize: 16, fontWeight: '700', lineHeight: 22, flex: 1 },
  actionLead:{ fontSize: 16, fontWeight: '700', lineHeight: 23 },
  summary: { fontSize: 14, marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  hint:    { fontSize: 12, marginBottom: 16 },
  primary: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  primaryTxt:{ fontSize: 16, fontWeight: '800', color: '#fff' },
  secondary:{ width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, marginBottom: 20 },
  secondaryTxt:{ fontSize: 15, fontWeight: '800' },
  noteBox: { borderRadius: 16, borderWidth: 1, padding: 18, marginTop: 10 },
  noteTitle:{ fontSize: 15, fontWeight: '800', marginBottom: 6 },
  noteBody:{ fontSize: 13, lineHeight: 19 },
});
