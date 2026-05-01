/**
 * Zentraler Einstellungen-Baum — flache iOS-artige Liste, Filter bleibt auf der Startseite.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

import { useStore } from '@/store';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { useBackup } from '@/hooks/useBackup';
import { useSheet } from '@/hooks/useSheet';
import { useLangPreference } from '@/hooks/useLangPreference';
import { useAiLangPreference } from '@/hooks/useAiLangPreference';
import { useAuth } from '@/providers/AuthContext';
import AppBottomSheet from '@/components/AppBottomSheet';
import Icon from '@/components/Icon';

import DesignThemeCard from '@/features/profile/components/DesignThemeCard';
import SimpleModeCard from '@/features/profile/components/SimpleModeCard';
import { UILanguageCard, AILanguageCard } from '@/features/profile/components/LanguageCards';
import NotificationsCard from '@/features/profile/components/NotificationsCard';
import BackupCard from '@/features/profile/components/BackupCard';
import AutomationCard from '@/features/profile/components/AutomationCard';
import PartnerEmailModal from '@/features/profile/components/PartnerEmailModal';
import { usePersistedPrefs } from '@/features/profile/usePersistedPrefs';
import {
  FlatGroup,
  FlatRow,
  SettingsSectionTitle,
} from '@/features/settings/SettingsPrimitives';
import { KontoShortcutsBlock, PrivacyLegalExtras } from '@/features/settings/SettingsGroupedBlocks';

export default function EinstellungenScreen({ showBack = true }: { showBack?: boolean }) {
  const router = useRouter();
  const { Colors: C, fs } = useTheme();
  const { t: T } = useT();
  const { state, dispatch } = useStore();
  const { logout } = useAuth();

  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const { exportBackup, importBackup, loading: backupLoading } = useBackup();
  const { lang, changeLang } = useLangPreference();
  const { aiLang, changeAiLang } = useAiLangPreference();
  const { config: sheetConfig, showSheet, hideSheet } = useSheet();

  const prefs = usePersistedPrefs();
  const [experteEin, setExperteEin] = useState(false);

  const datenschutz = state.einstellungen.datenschutzModus;

  const handleExport = useCallback(async () => {
    try {
      const ok = await exportBackup(state);
      if (!ok) {
        showSheet({
          title: 'Fehler',
          message: 'Export fehlgeschlagen.',
          icon: 'alert-circle',
          tone: 'danger',
          actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }],
        });
      }
    } catch (err: unknown) {
      showSheet({
        title: 'Fehler',
        message: (err as Error).message,
        icon: 'alert-circle',
        tone: 'danger',
        actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }],
      });
    }
  }, [exportBackup, hideSheet, showSheet, state]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.length) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      await importBackup({ data: JSON.parse(content), dispatch });
      showSheet({
        title: 'Erfolg',
        message: 'Backup wiederhergestellt',
        icon: 'checkmark-circle',
        tone: 'success',
        actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }],
      });
    } catch (err: unknown) {
      showSheet({
        title: 'Fehler',
        message: (err as Error).message,
        icon: 'alert-circle',
        tone: 'danger',
        actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }],
      });
    }
  }, [dispatch, hideSheet, importBackup, showSheet]);

  const docCount = state.dokumente.length;

  const appVersion = useMemo(
    () =>
      Constants.expoConfig?.version ??
      (Constants.manifest as { version?: string } | undefined)?.version ??
      '–',
    [],
  );

  const onAbmelden = useCallback(() => {
    Alert.alert(T('modal.logout.title'), T('settings.logout_info'), [
      { text: T('common.cancel'), style: 'cancel' },
      { text: T('settings.logout'), style: 'destructive', onPress: () => void logout() },
    ]);
  }, [logout, T]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {showBack ? (
        <View style={[sheetStyles.bar, { borderBottomColor: `${C.border}88` }]}>
          <TouchableOpacity
            onPress={() => safeBack(router)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={T('common.back')}
            style={sheetStyles.backBtn}
          >
            <Icon name="chevron-back" size={24} color={C.primary} />
          </TouchableOpacity>
          <Text style={[sheetStyles.title, { color: C.text, fontSize: fs(18) }]}>{T('settings.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
      ) : (
        <View style={[sheetStyles.bar, { borderBottomColor: `${C.border}88` }]}>
          <View style={{ width: 40 }} />
          <Text style={[sheetStyles.title, { color: C.text, fontSize: fs(18) }]}>{T('settings.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 44 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: fs(12),
            color: C.textTertiary,
            marginTop: -4,
            marginBottom: 4,
            lineHeight: fs(12) * 1.45,
          }}
        >
          {T('settings.lang_hint')}
        </Text>

        <SettingsSectionTitle label={T('settings.app')} />
        <FlatGroup>
          <UILanguageCard bare />
          <DesignThemeCard flat suppressSectionTitle />
          <SimpleModeCard flat suppressSectionTitle />
        </FlatGroup>

        <SettingsSectionTitle label={T('settings.notifications')} />
        <FlatGroup>
          <NotificationsCard
            flat
            pushEnabled={prefs.pushEnabled}
            setPushEnabled={prefs.setPushEnabled}
            weeklySummary={prefs.weeklySummary}
            setWeeklySummary={prefs.setWeeklySummary}
            partnerEmail={prefs.partnerEmail}
            onOpenPartnerEmail={() => setEmailModalOpen(true)}
            omitSectionTitle
          />
        </FlatGroup>

        <SettingsSectionTitle label={T('settings.documents')} />
        <FlatGroup>
          <FlatRow
            icon="sparkles-outline"
            label={T('settings.auto_analyse')}
            sub={T('settings.auto_analyse_sub')}
            right={
              <Switch
                value={prefs.autoAnalyse}
                onValueChange={prefs.setAutoAnalyse}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={prefs.autoAnalyse ? '#fff' : C.bgCard}
              />
            }
          />
        </FlatGroup>

        <SettingsSectionTitle label={T('settings.ai')} />
        <Text
          style={{
            fontSize: fs(13),
            color: C.textSecondary,
            lineHeight: fs(13) * 1.42,
            marginBottom: 4,
          }}
        >
          Vorlesen nutzt dieselbe Spracheinstellung wie die KI unten — Tempo weiterhin in den
          Geräte‑Barriereeinstellungen.
        </Text>
        <FlatGroup>
          <AILanguageCard bare aiLang={aiLang} changeAiLang={changeAiLang} />
        </FlatGroup>

        <SettingsSectionTitle label={T('settings.security')} />
        <FlatGroup>
          <FlatRow
            icon="lock-closed-outline"
            label={T('settings.app_lock')}
            sub={T('settings.app_lock_sub')}
            right={
              <Switch
                value={state.einstellungen.appSperre}
                onValueChange={(v: boolean) =>
                  dispatch({ type: 'UPDATE_EINSTELLUNGEN', payload: { appSperre: v } })
                }
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={state.einstellungen.appSperre ? '#fff' : C.bgCard}
              />
            }
          />
          <FlatRow
            icon="shield-checkmark-outline"
            label={T('settings.privacy_mode')}
            sub={T('settings.privacy_mode_sub')}
            right={
              <Switch
                value={datenschutz}
                onValueChange={(v: boolean) =>
                  dispatch({ type: 'UPDATE_EINSTELLUNGEN', payload: { datenschutzModus: v } })
                }
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={datenschutz ? '#fff' : C.bgCard}
              />
            }
          />
        </FlatGroup>

        <SettingsSectionTitle label={T('settings.data')} />
        <FlatGroup>
          <BackupCard
            flat
            docCount={docCount}
            loading={backupLoading}
            autoBackup={prefs.autoBackup}
            setAutoBackup={prefs.setAutoBackup}
            onExport={handleExport}
            onImport={handleImport}
          />
        </FlatGroup>

        <SettingsSectionTitle label={T('settings.account')} />
        <FlatGroup>
          <KontoShortcutsBlock flat router={router} logout={logout} docCount={docCount} />
        </FlatGroup>

        <TouchableOpacity
          onPress={onAbmelden}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Abmelden"
          style={{
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 12,
            marginTop: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: C.dangerBorder,
            backgroundColor: C.dangerLight,
          }}
        >
          <Text style={{ color: C.danger, fontSize: fs(15), fontWeight: '700' }}>{T('settings.logout')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setExperteEin(v => !v)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityState={{ expanded: experteEin }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            paddingHorizontal: 4,
            marginTop: 12,
          }}
        >
          <Text style={{ fontSize: fs(15), fontWeight: '700', color: C.text }}>
            {T('settings.advanced')}
          </Text>
          <Icon name={experteEin ? 'chevron-up' : 'chevron-down'} size={22} color={C.textTertiary} />
        </TouchableOpacity>

        {experteEin ? (
          <>
            <SettingsSectionTitle label="Automatisierung" />
            <FlatGroup>
              <AutomationCard flat onOpenRegelmarkt={() => router.push('/(tabs)/Marktplatz')} />
            </FlatGroup>
            <SettingsSectionTitle label="Recht & Daten" />
            <FlatGroup>
              <PrivacyLegalExtras />
            </FlatGroup>
          </>
        ) : null}

        <View style={{ alignItems: 'center', paddingTop: 16 }}>
          <Text style={{ fontSize: fs(11), color: C.textTertiary }}>
            {T('settings.version', { v: appVersion })}
          </Text>
        </View>
      </ScrollView>

      <PartnerEmailModal
        visible={emailModalOpen}
        partnerEmail={prefs.partnerEmail}
        onSave={prefs.setPartnerEmail}
        onClose={() => setEmailModalOpen(false)}
      />

      <AppBottomSheet
        visible={!!sheetConfig}
        onClose={hideSheet}
        title={sheetConfig?.title ?? ''}
        message={sheetConfig?.message}
        icon={sheetConfig?.icon ?? 'information-circle'}
        tone={sheetConfig?.tone ?? 'default'}
        actions={
          sheetConfig?.actions ?? [{ label: 'OK', variant: 'primary', onPress: hideSheet }]
        }
      />
    </SafeAreaView>
  );
}

const sheetStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
