import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { SectionCard, Row } from '@/features/profile/components/ProfileSection';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { useAuth } from '@/providers/AuthContext';
import type { Router } from 'expo-router';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

export function PrivacyLegalExtras() {
  const { Colors: C, fs } = useTheme();
  const { t: T } = useT();
  const onPrivacyInfo = () => {
    Alert.alert(T('settings.privacy_info'), T('settings.privacy_mode_sub'));
  };
  return (
    <>
      <FlatRow
        icon="globe-outline"
        label={T('settings.privacy_info')}
        sub={T('common.understood')}
        onPress={onPrivacyInfo}
        right={<Icon name="information-circle-outline" size={18} color={C.textTertiary} />}
      />
    </>
  );
}

type KontoProps = {
  router: Router;
  logout: () => void | Promise<void>;
  docCount: number;
  flat?: boolean;
  onPlusPress?: () => void;
};

export function KontoShortcutsBlock({ router, logout, docCount, flat = false, onPlusPress }: KontoProps) {
  const { Colors: C, Shadow, fs } = useTheme();
  const { t: T } = useT();
  const { user } = useAuth();
  const isGuest = user?.isGuest === true;
  const goProfil = () => router.push('/profil');

  if (flat) {
    return (
      <>
        <FlatRow icon="person-outline"
          label={T('settings.konto_profile')}
          sub={T('settings.konto_docs', { n: docCount })}
          onPress={goProfil}
          right={<Icon name="chevron-forward" size={20} color={C.textTertiary} />}
        />
      </>
    );
  }

  return (
    <SectionCard color={C.text}>
      <TouchableOpacity
        style={[kz.row, { backgroundColor: C.bgCard, borderColor: C.borderLight }, Shadow.sm]}
        onPress={goProfil}
        accessibilityRole="button"
      >
        <Icon name="person-outline" size={22} color={C.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: fs(14), fontWeight: '700', color: C.text }}>{T('settings.konto_profile')}</Text>
          <Text style={{ fontSize: fs(11), color: C.textTertiary, marginTop: 2 }}>
            {T('settings.konto_docs', { n: docCount })}
          </Text>
        </View>
        <Icon name="chevron-forward" size={20} color={C.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          if (isGuest) { router.push('/login'); return; }
          Alert.alert(T('modal.logout.title'), T('modal.logout.body'), [
            { text: T('common.cancel'), style: 'cancel' },
            { text: T('settings.logout'), style: 'destructive', onPress: () => { void logout(); } },
          ]);
        }}
        style={{ marginTop: 8, alignItems: 'center', paddingVertical: 14,
          borderRadius: 14, borderWidth: 1,
          borderColor: isGuest ? `${C.primary}55` : C.dangerBorder,
          backgroundColor: isGuest ? C.primaryLight : C.dangerLight }}
      >
        <Text style={{ color: isGuest ? C.primaryDark : C.danger, fontSize: fs(14), fontWeight: '700' }}>
          {isGuest ? T('auth.login') : T('settings.logout')}
        </Text>
      </TouchableOpacity>
    </SectionCard>
  );
}

const kz = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, borderWidth: 1 },
});
