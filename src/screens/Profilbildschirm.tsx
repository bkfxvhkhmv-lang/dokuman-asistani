import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LANGUAGES } from '../i18n/langConfig';
import { useLangPreference } from '../hooks/useLangPreference';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useStore } from '../store';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../providers/AuthContext';
import { useBackup } from '../hooks/useBackup';
import { useAuthFlow } from '../hooks/useAuthFlow';
import { useSheet } from '../hooks/useSheet';
import AppBottomSheet from '../components/AppBottomSheet';
import Icon from '../components/Icon';

const PREF_KEYS = {
  push:          '@briefpilot_pref_push',
  weekly:        '@briefpilot_pref_weekly',
  autoBackup:    '@briefpilot_pref_autobackup',
  partnerEmail:  '@briefpilot_pref_partner_email',
};

export default function Profilbildschirm() {
  const router = useRouter();
  const { Colors, Shadow, isDark, toggleTheme, isSimpleMode, toggleSimpleMode } = useTheme();
  const C = Colors;
  const { state, dispatch } = useStore();
  const { logout } = useAuth();

  const [pushEnabled,    setPushEnabled]    = useState(true);
  const [weeklySummary,  setWeeklySummary]  = useState(false);
  const [autoBackup,     setAutoBackup]     = useState(true);
  const [userEmail,      setUserEmail]      = useState('');
  const [partnerEmail,   setPartnerEmail]   = useState('');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDraft,     setEmailDraft]     = useState('');

  const { exportBackup, importBackup, loading: backupLoading } = useBackup();
  const { lang, changeLang } = useLangPreference();
  const { getUser } = useAuthFlow();
  const { config: sheetConfig, showSheet, hideSheet } = useSheet();

  // Load persisted prefs
  useEffect(() => {
    getUser()
      .then((u: any) => u && setUserEmail(u.email))
      .catch(e => console.warn('[Profil] getUser error', e));

    AsyncStorage.multiGet([PREF_KEYS.push, PREF_KEYS.weekly, PREF_KEYS.autoBackup, PREF_KEYS.partnerEmail])
      .then(pairs => {
        const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
        if (map[PREF_KEYS.push]       !== null) setPushEnabled(map[PREF_KEYS.push] !== 'false');
        if (map[PREF_KEYS.weekly]     !== null) setWeeklySummary(map[PREF_KEYS.weekly] === 'true');
        if (map[PREF_KEYS.autoBackup] !== null) setAutoBackup(map[PREF_KEYS.autoBackup] !== 'false');
        if (map[PREF_KEYS.partnerEmail])        setPartnerEmail(map[PREF_KEYS.partnerEmail] ?? '');
      })
      .catch(e => console.warn('[Profil] load prefs error', e));
  }, []);

  const savePref = (key: string, value: boolean | string) =>
    AsyncStorage.setItem(key, String(value)).catch(e => console.warn('[Profil] savePref error', e));

  const handleExport = useCallback(async () => {
    try {
      const ok = await exportBackup(state);
      if (!ok) showSheet({ title: 'Fehler', message: 'Export fehlgeschlagen.', icon: 'alert-circle', tone: 'danger', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
    } catch (err: unknown) {
      showSheet({ title: 'Fehler', message: (err as Error).message, icon: 'alert-circle', tone: 'danger', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
    }
  }, [exportBackup, hideSheet, showSheet, state]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.length) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      await importBackup({ data: JSON.parse(content), dispatch });
      showSheet({ title: 'Erfolg', message: 'Backup wiederhergestellt', icon: 'checkmark-circle', tone: 'success', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
    } catch (err: unknown) {
      showSheet({ title: 'Fehler', message: (err as Error).message, icon: 'alert-circle', tone: 'danger', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
    }
  }, [dispatch, hideSheet, importBackup, showSheet]);

  const totalOpenAmount = useMemo(() =>
    state.dokumente.filter(d => !d.erledigt && d.betrag).reduce((s, d) => s + (d.betrag || 0), 0),
    [state.dokumente]
  );

  const appVersion = Constants.expoConfig?.version ?? Constants.manifest?.version ?? '–';

  const SectionCard = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <View style={{
      backgroundColor: `${color}08`, borderRadius: 20, padding: 18,
      overflow: 'hidden', borderWidth: 1, borderColor: `${color}22`,
      ...Shadow.sm,
    }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: `${color}99`, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
      {children}
    </View>
  );

  const SectionTitle = ({ label, color }: { label: string; color: string }) => (
    <Text style={{ fontSize: 11, fontWeight: '800', color, marginBottom: 14, letterSpacing: 0.8 }}>{label}</Text>
  );

  const Row = ({ icon, label, sub, right }: { icon: string; label: string; sub?: string; right?: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sub ? 16 : 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: C.bgInput, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={17} color={C.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '500', letterSpacing: -0.1 }}>{label}</Text>
          {sub ? <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2, letterSpacing: 0.1 }}>{sub}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>

        {/* Kullanıcı kartı */}
        <View style={{ backgroundColor: C.bgCard, borderRadius: 20, padding: 20, ...Shadow.sm, borderWidth: 1, borderColor: C.borderLight }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: `${C.primary}33` }}>
              <Icon name="person" size={24} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: -0.3 }}>{userEmail || 'Gast'}</Text>
              <Text style={{ fontSize: 12, color: C.textTertiary, marginTop: 3, letterSpacing: 0.1 }}>
                {state.dokumente.length} Dokumente · {totalOpenAmount > 0 ? `${totalOpenAmount.toFixed(2)} € offen` : 'Kein offener Betrag'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={logout}
            style={{ marginTop: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.dangerBorder, alignItems: 'center', backgroundColor: C.dangerLight }}>
            <Text style={{ color: C.danger, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 }}>Abmelden</Text>
          </TouchableOpacity>
        </View>

        {/* Görünüm */}
        <SectionCard color={C.primary}>
          <SectionTitle label="GÖRÜNÜM" color={C.primary} />
          <Row icon="moon-outline" label="Dunkelmodus"
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={isDark ? '#fff' : C.bgCard}
              />
            }
          />
          {/* #103 Simple Mode toggle */}
          <Row icon="glasses-outline" label="Einfacher Modus"
            right={
              <Switch
                value={isSimpleMode}
                onValueChange={toggleSimpleMode}
                trackColor={{ false: C.border, true: C.success }}
                thumbColor={isSimpleMode ? '#fff' : C.bgCard}
              />
            }
          />
        </SectionCard>

        {/* KI Sprache */}
        <View style={{ backgroundColor: C.bgCard, borderRadius: 20, padding: 18, ...Shadow.sm, borderWidth: 1, borderColor: C.borderLight }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.textTertiary, marginBottom: 14, letterSpacing: 0.8 }}>KI-SPRACHE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', gap: 8 }}>
            {LANGUAGES.filter(l => l.priority).map(l => (
              <TouchableOpacity key={l.code}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5,
                  borderColor: lang === l.code ? C.primary : C.border,
                  backgroundColor: lang === l.code ? C.primaryLight : C.bgInput }}
                onPress={() => changeLang(l.code)}
                activeOpacity={0.75}>
                <Text style={{ fontSize: 13, fontWeight: lang === l.code ? '700' : '500',
                  color: lang === l.code ? C.primaryDark : C.textSecondary }}>
                  {l.flag} {l.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 12, letterSpacing: 0.1 }}>
            KI-Zusammenfassungen erscheinen in der gewählten Sprache.
          </Text>
        </View>

        {/* Benachrichtigungen */}
        <SectionCard color={C.primary}>
          <SectionTitle label="BENACHRICHTIGUNGEN" color={C.primary} />
          <Row icon="notifications-outline" label="Frist-Erinnerungen"
            right={
              <Switch value={pushEnabled} trackColor={{ false: C.border, true: C.primary }} thumbColor={pushEnabled ? '#fff' : C.bgCard}
                onValueChange={v => { setPushEnabled(v); savePref(PREF_KEYS.push, v); }} />
            }
          />
          <TouchableOpacity onPress={() => { setEmailDraft(partnerEmail); setEmailModalOpen(true); }}>
            <Row icon="mail-outline" label="Partner-E-Mail"
              sub={partnerEmail || 'Noch nicht gesetzt'}
              right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
            />
          </TouchableOpacity>
          <Row icon="calendar-outline" label="Wöchentliche Zusammenfassung"
            right={
              <Switch value={weeklySummary} trackColor={{ false: C.border, true: C.primary }} thumbColor={weeklySummary ? '#fff' : C.bgCard}
                onValueChange={v => { setWeeklySummary(v); savePref(PREF_KEYS.weekly, v); }} />
            }
          />
        </SectionCard>

        {/* Datensicherung */}
        <SectionCard color={C.success}>
          <SectionTitle label="DATENSICHERUNG" color={C.success} />
          <TouchableOpacity onPress={handleExport} disabled={backupLoading}>
            <Row icon="document-text-outline" label="Sicherung exportieren"
              sub={`${state.dokumente.length} Dokumente als JSON`}
              right={<Icon name="share-outline" size={16} color={C.textTertiary} />}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleImport} disabled={backupLoading}>
            <Row icon="folder-open-outline" label="Sicherung importieren"
              sub="JSON-Datei wiederherstellen"
              right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
            />
          </TouchableOpacity>
          <Row icon="refresh-outline" label="Automatische Sicherung"
            right={
              <Switch value={autoBackup} trackColor={{ false: C.border, true: C.success }} thumbColor={autoBackup ? '#fff' : C.bgCard}
                onValueChange={v => { setAutoBackup(v); savePref(PREF_KEYS.autoBackup, v); }} />
            }
          />
        </SectionCard>

        {/* Automatisierung */}
        <SectionCard color={C.warning}>
          <SectionTitle label="AUTOMATISIERUNG" color={C.warning} />
          <TouchableOpacity onPress={() => router.push('/(tabs)/Marktplatz')}>
            <Row icon="flash-outline" label="Regelmarkt öffnen"
              sub="Automatische Aktionsketten verwalten"
              right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
            />
          </TouchableOpacity>
        </SectionCard>

        {/* Offene Beträge */}
        <View style={{ backgroundColor: `${C.primary}10`, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: `${C.primary}20`, ...Shadow.sm }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.6, marginBottom: 6 }}>OFFENE BETRÄGE GESAMT</Text>
          <Text style={{ fontSize: 32, fontWeight: '800', color: C.primary, letterSpacing: -1 }}>
            {totalOpenAmount.toFixed(2)} €
          </Text>
          {totalOpenAmount === 0 && (
            <Text style={{ fontSize: 12, color: C.textTertiary, marginTop: 4 }}>Keine offenen Zahlungen</Text>
          )}
        </View>

        {/* Über die App */}
        <View style={{ alignItems: 'center', gap: 6, paddingVertical: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <Icon name="sparkle" size={18} color={C.primary} weight="fill" />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.textSecondary, letterSpacing: -0.2 }}>BriefPilot</Text>
          <Text style={{ fontSize: 11, color: C.textTertiary, letterSpacing: 0.2 }}>Version {appVersion}</Text>
        </View>

      </ScrollView>

      {/* Partner-E-Mail Modal */}
      <Modal visible={emailModalOpen} transparent animationType="slide" presentationStyle="overFullScreen">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setEmailModalOpen(false)} />
          <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6 }}>Partner-E-Mail</Text>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
              Für Benachrichtigungen an Ihren Partner oder Ehepartner.
            </Text>
            <TextInput
              value={emailDraft}
              onChangeText={setEmailDraft}
              placeholder="partner@email.de"
              placeholderTextColor={C.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput,
                color: C.text, fontSize: 15, padding: 14, marginBottom: 16 }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {partnerEmail ? (
                <TouchableOpacity onPress={() => { setPartnerEmail(''); savePref(PREF_KEYS.partnerEmail, ''); setEmailModalOpen(false); }}
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: C.dangerBorder, alignItems: 'center', backgroundColor: C.dangerLight }}>
                  <Text style={{ color: C.danger, fontWeight: '600' }}>Entfernen</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => { setPartnerEmail(emailDraft.trim()); savePref(PREF_KEYS.partnerEmail, emailDraft.trim()); setEmailModalOpen(false); }}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: C.primary }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AppBottomSheet
        visible={!!sheetConfig}
        onClose={hideSheet}
        title={sheetConfig?.title ?? ''}
        message={sheetConfig?.message}
        icon={sheetConfig?.icon ?? 'information-circle'}
        tone={sheetConfig?.tone ?? 'default'}
        actions={sheetConfig?.actions ?? [{ label: 'OK', variant: 'primary', onPress: hideSheet }]}
      />
    </SafeAreaView>
  );
}
