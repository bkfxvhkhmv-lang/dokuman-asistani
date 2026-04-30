/**
 * Ergänzende Einstellungsblöcke: Dokument-/Experten (Platzhalter), Sprache, Sicherheit, Konto.
 */
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { SectionCard, Row } from '@/features/profile/components/ProfileSection';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import type { Router } from 'expo-router';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

export function PrivacyLegalExtras() {
  const { Colors: C, fs } = useTheme();
  const onPrivacyInfo = () => {
    Alert.alert(
      'Datenschutzerklärung',
      'Der vollständige Text wird mit dem Web‑Auftritt verknüpft. In dieser Vorschauversion ist er noch nicht hinterlegt.',
    );
  };
  return (
    <>
      <FlatRow
        icon="globe-outline"
        label="Datenschutzerklärung"
        sub="Hinweis anzeigen"
        onPress={onPrivacyInfo}
        right={<Icon name="information-circle-outline" size={18} color={C.textTertiary} />}
      />
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Icon name="trash-outline" size={18} color={C.danger} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, color: C.textSecondary, fontSize: fs(13), lineHeight: 18 }}>
            Alle lokalen Daten löschen — kontrollierte Löschung folgt später über diese Stelle.
          </Text>
        </View>
      </View>
    </>
  );
}

type KontoProps = {
  router: Router;
  logout: () => void | Promise<void>;
  docCount: number;
  /** Flache Zeilen im Einstellungen-Baum */
  flat?: boolean;
};

export function KontoShortcutsBlock({ router, logout, docCount, flat = false }: KontoProps) {
  const { Colors: C, Shadow, fs } = useTheme();
  const goProfil = () => router.push('/(tabs)/Profil');

  if (flat) {
    return (
      <>
        <FlatRow
          icon="person-outline"
          label="Profil"
          sub={`${docCount} Dokumente auf diesem Gerät`}
          onPress={goProfil}
          right={<Icon name="chevron-forward" size={20} color={C.textTertiary} />}
        />
        <FlatRow
          icon="sparkle"
          label="Abo · BriefPilot Plus"
          sub="Bald hier verfügbar"
          right={<Icon name="ellipsis-horizontal" size={18} color={C.textTertiary} />}
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
          <Text style={{ fontSize: fs(14), fontWeight: '700', color: C.text }}>Profil</Text>
          <Text style={{ fontSize: fs(11), color: C.textTertiary, marginTop: 2 }}>
            {docCount} Dokumente auf diesem Gerät
          </Text>
        </View>
        <Icon name="chevron-forward" size={20} color={C.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity style={[kz.row, { opacity: 0.72 }]} disabled>
        <Icon name="sparkle" size={22} color={C.textTertiary} weight="fill" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: fs(14), fontWeight: '700', color: C.text }}>Abo · BriefPilot Plus</Text>
          <Text style={{ fontSize: fs(11), color: C.textTertiary, marginTop: 2 }}>Bald hier verfügbar</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Abmelden?',
            'Du kann dich jederzeit wieder anmelden.',
            [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Abmelden', style: 'destructive', onPress: () => { void logout(); } },
            ],
          );
        }}
        style={{
          marginTop: 8,
          alignItems: 'center',
          paddingVertical: 14,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.dangerBorder,
          backgroundColor: C.dangerLight,
        }}
      >
        <Text style={{ color: C.danger, fontSize: fs(14), fontWeight: '700' }}>Abmelden</Text>
      </TouchableOpacity>
    </SectionCard>
  );
}

const kz = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
});
