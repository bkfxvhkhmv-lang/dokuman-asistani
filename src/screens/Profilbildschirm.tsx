import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View, Text, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useStore } from '@/store';
import { getTageVerbleibend } from '@/utils/formatters';
import { useTheme } from '@/ThemeContext';
import { useAuth } from '@/providers/AuthContext';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import Icon from '@/components/Icon';

type MenuRow = {
  icon: string;
  label: string;
  sub?: string;
  premium?: boolean;
  danger?: boolean;
  badge?: number | string;
  onPress: () => void;
};

function MenuSection({ rows }: { rows: MenuRow[] }) {
  const { Colors: C } = useTheme();
  return (
    <View style={[st.section, { backgroundColor: C.bgCard, borderColor: C.borderLight }]}>
      {rows.map((row, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={row.onPress}
          activeOpacity={0.7}
          style={[
            st.row,
            {
              borderBottomWidth: idx < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: C.borderLight,
            },
          ]}
        >
          <View style={[st.iconBox, { backgroundColor: row.danger ? C.dangerLight : C.primaryLight }]}>
            <Icon name={row.icon} size={18} color={row.danger ? C.danger : C.primary} />
          </View>

          <View style={st.rowBody}>
            <View style={st.rowTitleRow}>
              <Text style={[st.rowLabel, { color: row.danger ? C.danger : C.text }]}>
                {row.label}
              </Text>
              {row.premium && (
                <View style={st.premiumPill}>
                  <Text style={st.premiumText}>PREMIUM</Text>
                </View>
              )}
              {row.badge !== undefined && (
                <View style={[st.badge, { backgroundColor: C.primary }]}>
                  <Text style={st.badgeText}>{row.badge}</Text>
                </View>
              )}
            </View>
            {row.sub ? (
              <Text style={[st.rowSub, { color: C.textSecondary }]}>{row.sub}</Text>
            ) : null}
          </View>

          {!row.danger && <Icon name="caret-right" size={15} color={C.borderLight} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  const { Colors: C } = useTheme();
  return (
    <Text style={[st.sectionLabel, { color: C.textTertiary }]}>{text}</Text>
  );
}

export default function Profilbildschirm() {
  const router = useRouter();
  const { state } = useStore();
  const { logout, user } = useAuth();
  const isGuest = user?.isGuest === true;
  const { getUser } = useAuthFlow();
  const { Colors: C } = useTheme();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    getUser()
      .then((u: { email?: string } | null) => u?.email && setUserEmail(u.email))
      .catch(() => {});
  }, [getUser]);

  const offeneFristen = useMemo(() =>
    state.dokumente.filter(d => {
      if (d.erledigt || !d.frist) return false;
      const t = getTageVerbleibend(d.frist);
      return t !== null && t >= 0;
    }).length,
    [state.dokumente],
  );

  const appVersion =
    Constants.expoConfig?.version ??
    (Constants.manifest as { version?: string } | undefined)?.version ?? '–';

  const showDatenschutz = () =>
    Alert.alert('Datenschutz', 'Deine Daten bleiben auf deinem Gerät.\nDie vollständige Datenschutzerklärung findest du auf briefpilot.de.', [{ text: 'OK' }]);

  const showAbmelden = () => {
    if (isGuest) { router.push('/login'); return; }
    Alert.alert('Abmelden?', 'Du wirst aus deinem Konto ausgeloggt.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: logout },
    ]);
  };

  const initialName = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

  const insets = useSafeAreaInsets();

  return (
    <View style={[st.safe, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[st.header, { backgroundColor: C.primaryDark, paddingTop: insets.top + 16 }]}>
        <View style={st.headerRow}>
          <View style={st.avatar}>
            <Text style={st.avatarText}>
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'B'}
            </Text>
          </View>
          <View style={st.headerInfo}>
            <Text style={st.headerName} numberOfLines={1}>
              {userEmail || 'Mein Profil'}
            </Text>
            <Text style={st.headerSub}>{state.dokumente.length} Dokumente gespeichert</Text>
            {/* upgrade pill hidden until Plus is available */}
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={st.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="close" size={20} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[st.scroll, { backgroundColor: C.bg }]} showsVerticalScrollIndicator={false}>
        <MenuSection rows={[
          {
            icon: 'calendar',
            label: 'Offene Fristen',
            sub: `${offeneFristen} ${offeneFristen === 1 ? 'Frist' : 'Fristen'} offen`,
            badge: offeneFristen > 0 ? offeneFristen : undefined,
            onPress: () => router.push('/(tabs)/index'),
          },
        ]} />

        <SectionLabel text="KONTO" />
        <MenuSection rows={[
          {
            icon: 'gear',
            label: 'Einstellungen',
            onPress: () => router.push('/einstellungen'),
          },
          {
            icon: 'lock',
            label: 'Datenschutz',
            onPress: showDatenschutz,
          },
          {
            icon: 'information-circle',
            label: 'Über BriefPilot',
            sub: `Version ${appVersion}`,
            onPress: () => Alert.alert('BriefPilot', `Version ${appVersion}\n\nDeine Dokumente. Dein Überblick.`),
          },
        ]} />

        <MenuSection rows={[
          {
            icon: isGuest ? 'key' : 'log-out',
            label: isGuest ? 'Anmelden' : 'Abmelden',
            danger: !isGuest,
            onPress: showAbmelden,
          },
        ]} />

        <Text style={[st.version, { color: C.textTertiary }]}>BriefPilot {appVersion}</Text>
      </ScrollView>

    </View>
  );
}

const st = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar:       { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText:   { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerInfo:   { flex: 1 },
  headerName:   { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  upgradePill:  { marginTop: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 10, paddingVertical: 4 },
  upgradeText:  { fontSize: 12, fontWeight: '700', color: '#fff' },

  scroll:       { paddingTop: 20, paddingBottom: 60 },

  section:      { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 18, gap: 14 },
  iconBox:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowBody:      { flex: 1 },
  rowTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel:     { fontSize: 15, fontWeight: '600' },
  rowSub:       { fontSize: 12, marginTop: 2 },
  premiumPill:  { backgroundColor: '#FEF9C3', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  premiumText:  { fontSize: 10, fontWeight: '800', color: '#92400E' },
  badge:        { borderRadius: 999, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText:    { fontSize: 11, fontWeight: '800', color: '#fff' },

  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginLeft: 20, marginBottom: 8 },
  version:      { textAlign: 'center', fontSize: 11, marginTop: 8 },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
