/**
 * Zentraler Einstellungen-Baum — flache iOS-artige Liste, Filter bleibt auf der Startseite.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
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
import { DocumentMemory } from '@/core/intelligence/DocumentMemory';

import DesignThemeCard from '@/features/profile/components/DesignThemeCard';
import SimpleModeCard from '@/features/profile/components/SimpleModeCard';
import { UILanguageCard, AILanguageCard } from '@/features/profile/components/LanguageCards';
import NotificationsCard from '@/features/profile/components/NotificationsCard';
import BackupCard from '@/features/profile/components/BackupCard';
import AutomationCard from '@/features/profile/components/AutomationCard';
import PartnerEmailModal from '@/features/profile/components/PartnerEmailModal';
import { usePersistedPrefs } from '@/features/profile/usePersistedPrefs';
import BriefPilotPlusSheet from '@/features/premium/BriefPilotPlusSheet';
import {
  FlatGroup,
  FlatRow,
  SettingsSectionTitle,
} from '@/features/settings/SettingsPrimitives';
import { KontoShortcutsBlock, PrivacyLegalExtras } from '@/features/settings/SettingsGroupedBlocks';
import FeedbackModal from '@/features/feedback/FeedbackModal';

export default function EinstellungenScreen({ showBack = true }: { showBack?: boolean }) {
  const router = useRouter();
  const { Colors: C, fs } = useTheme();
  const { t: T } = useT();
  const { state, dispatch } = useStore();
  const { logout, user } = useAuth();
  const isGuest = user?.isGuest === true;

  const [emailModalOpen,   setEmailModalOpen]   = useState(false);
  const [plusVisible,      setPlusVisible]      = useState(false);
  const [feedbackVisible,  setFeedbackVisible]  = useState(false);

  const { exportBackup, importBackup, loading: backupLoading } = useBackup();
  const { lang, changeLang } = useLangPreference();
  const { aiLang, changeAiLang } = useAiLangPreference();
  const { config: sheetConfig, showSheet, hideSheet } = useSheet();
  const showAutomationMarketplace = __DEV__;

  const prefs = usePersistedPrefs();
  const [experteEin, setExperteEin] = useState(false);
  const { bottom: safeBottom } = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

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
    const snapshot = { dokumente: state.dokumente, einstellungen: state.einstellungen };
    await importBackup(dispatch, snapshot);
  }, [dispatch, importBackup, state.dokumente, state.einstellungen]);

  const docCount = state.dokumente.length;

  const appVersion = useMemo(
    () =>
      Constants.expoConfig?.version ??
      (Constants.manifest as { version?: string } | undefined)?.version ??
      '–',
    [],
  );

  const onAbmelden = useCallback(() => {
    if (isGuest) {
      router.push('/login');
      return;
    }
    Alert.alert(T('modal.logout.title'), T('modal.logout.body'), [
      { text: T('common.cancel'), style: 'cancel' },
      { text: T('settings.logout'), style: 'destructive', onPress: () => void logout() },
    ]);
  }, [isGuest, logout, router, T]);

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
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: tabBarHeight + safeBottom + 32 }}
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
          {__DEV__ && (
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
          )}
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
          {T('settings.tts_note')}
        </Text>
        <FlatGroup>
          <AILanguageCard bare aiLang={aiLang} changeAiLang={changeAiLang} />
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
          <KontoShortcutsBlock flat router={router} logout={logout} docCount={docCount} onPlusPress={() => setPlusVisible(true)} />
        </FlatGroup>

        {/* Beta-Feedback */}
        {__DEV__ && state.dokumente.some(d => d.isDemo) && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Demo zurücksetzen?',
                'Die Demo-Dokumente werden auf den ursprünglichen Stand zurückgesetzt. Deine eigenen Dokumente bleiben erhalten.',
                [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Zurücksetzen', onPress: async () => {
                    const oldDemoIds = state.dokumente.filter(d => d.isDemo).map(d => d.id);
                    dispatch({ type: 'RESET_DEMO' });
                    await DocumentMemory.deleteAll(oldDemoIds);
                  }},
                ],
              );
            }}
            activeOpacity={0.75}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingVertical: 12, borderRadius: 12, marginTop: 4,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: C.border,
              backgroundColor: C.bgInput,
            }}
          >
            <Icon name="refresh" size={16} color={C.textSecondary} />
            <Text style={{ color: C.textSecondary, fontSize: fs(13), fontWeight: '600' }}>
              Demo zurücksetzen
            </Text>
          </TouchableOpacity>
        )}


        <TouchableOpacity
          onPress={() => setFeedbackVisible(true)}
          activeOpacity={0.75}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 14, borderRadius: 12, marginTop: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: C.primary + '44',
            backgroundColor: C.primaryLight,
          }}
        >
          <Icon name="envelope" size={18} color={C.primary} />
          <Text style={{ color: C.primary, fontSize: fs(14), fontWeight: '700' }}>
            {T('feedback.send')}
          </Text>
        </TouchableOpacity>

        <FeedbackModal
          visible={feedbackVisible}
          onClose={() => setFeedbackVisible(false)}
          initialScreen="Einstellungen"
        />

        <TouchableOpacity
          onPress={onAbmelden}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={isGuest ? T('auth.login') : T('settings.logout')}
          style={{
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 12,
            marginTop: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: isGuest ? `${C.primary}55` : C.dangerBorder,
            backgroundColor: isGuest ? C.primaryLight : C.dangerLight,
          }}
        >
          <Text style={{ color: isGuest ? C.primaryDark : C.danger, fontSize: fs(15), fontWeight: '700' }}>
            {isGuest ? T('auth.login') : T('settings.logout')}
          </Text>
        </TouchableOpacity>

        {__DEV__ && (
          <>
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
                {showAutomationMarketplace ? (
                  <>
                    <SettingsSectionTitle label="Automatisierung" />
                    <FlatGroup>
                      <AutomationCard flat onOpenRegelmarkt={() => router.push('/(tabs)/Marktplatz')} />
                    </FlatGroup>
                  </>
                ) : null}
                <SettingsSectionTitle label="Recht & Daten" />
                <FlatGroup>
                  <PrivacyLegalExtras />
                </FlatGroup>
              </>
            ) : null}
          </>
        )}

        <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 8 }}>
          <Text style={{ fontSize: fs(11), color: C.textTertiary, opacity: 0.6 }}>
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

      <BriefPilotPlusSheet visible={plusVisible} onClose={() => setPlusVisible(false)} />

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
