/**
 * Profilbildschirm — Accountable-Pattern: farbiger Header + flache Menüliste.
 * Keine schweren Karten, nur einfache Trennlinien wie iOS Einstellungen.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ScrollView, TouchableOpacity, View, Text, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

import { useStore } from '@/store';
import { getTageVerbleibend } from '@/utils/formatters';
import { useTheme } from '@/ThemeContext';
import { useAuth } from '@/providers/AuthContext';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import Icon from '@/components/Icon';

// Profil-Blauton — eigene Sektionsfarbe
const PROFIL_GRAD_A = '#1E3A8A';
const PROFIL_GRAD_B = '#1D4ED8';

const HR_COLOR = '#F3F4F6';

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
  return (
    <View style={{
      marginHorizontal: 16,
      backgroundColor: '#fff',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {rows.map((row, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={row.onPress}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 15,
            paddingHorizontal: 18,
            gap: 14,
            borderBottomWidth: idx < rows.length - 1 ? Platform.OS === 'ios' ? 0.5 : 1 : 0,
            borderBottomColor: HR_COLOR,
          }}
        >
          <View style={{
            width: 34, height: 34, borderRadius: 10,
            backgroundColor: row.danger ? '#FEE2E2' : '#EFF6FF',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon
              name={row.icon}
              size={18}
              color={row.danger ? '#DC2626' : '#1D4ED8'}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{
                fontSize: 15, fontWeight: '600',
                color: row.danger ? '#DC2626' : '#111827',
              }}>
                {row.label}
              </Text>
              {row.premium && (
                <View style={{
                  backgroundColor: '#FEF9C3', borderRadius: 999,
                  paddingHorizontal: 7, paddingVertical: 2,
                  flexDirection: 'row', alignItems: 'center', gap: 3,
                }}>
                  <Text style={{ fontSize: 9 }}>⭐</Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400E' }}>PREMIUM</Text>
                </View>
              )}
              {row.badge !== undefined && (
                <View style={{
                  backgroundColor: '#1D4ED8', borderRadius: 999,
                  minWidth: 20, height: 20, alignItems: 'center',
                  justifyContent: 'center', paddingHorizontal: 6,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>
                    {row.badge}
                  </Text>
                </View>
              )}
            </View>
            {row.sub ? (
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{row.sub}</Text>
            ) : null}
          </View>

          {!row.danger && (
            <Icon name="caret-right" size={15} color="#D1D5DB" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function Profilbildschirm() {
  const { state } = useStore();
  const { logout } = useAuth();
  const { getUser } = useAuthFlow();
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

  const showPremiumAlert = () =>
    Alert.alert(
      'BriefPilot Plus',
      'Erweiterte Funktionen – Steuerpaket-Export, unbegrenzte Belege und mehr.\n\nKommt bald.',
      [{ text: 'OK' }],
    );

  const showDatenschutz = () =>
    Alert.alert(
      'Datenschutz',
      'Deine Daten bleiben auf deinem Gerät.\nDie vollständige Datenschutzerklärung findest du auf briefpilot.de.',
      [{ text: 'OK' }],
    );

  const showAbmelden = () =>
    Alert.alert('Abmelden?', 'Du wirst aus deinem Konto ausgeloggt.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: logout },
    ]);

  const initialName = userEmail
    ? userEmail.charAt(0).toUpperCase()
    : '?';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} edges={['top']}>
      {/* Blauer Header — Accountable-Stil */}
      <LinearGradient
        colors={[PROFIL_GRAD_A, PROFIL_GRAD_B]}
        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
          }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff' }}>
              {initialName}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }} numberOfLines={1}>
              {userEmail || 'Mein Konto'}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              {state.dokumente.length} Belege gespeichert
            </Text>

            {/* Basis-Plan Pill */}
            <TouchableOpacity onPress={showPremiumAlert} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 999, borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
                paddingHorizontal: 10, paddingVertical: 4,
                flexDirection: 'row', alignItems: 'center', gap: 5,
              }}>
                <Text style={{ fontSize: 10 }}>⭐</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>
                  Basis · Auf Plus upgraden
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hauptmenü */}
        <MenuSection rows={[
          {
            icon: 'sparkle',
            label: 'BriefPilot Plus',
            sub: 'Steuerpaket, unbegrenzte Belege & mehr',
            premium: true,
            onPress: showPremiumAlert,
          },
          {
            icon: 'calendar',
            label: 'Offene Fristen',
            sub: `${offeneFristen} ${offeneFristen === 1 ? 'Frist' : 'Fristen'} offen`,
            badge: offeneFristen > 0 ? offeneFristen : undefined,
            onPress: () => {},
          },
          {
            icon: 'export',
            label: 'Datenexport',
            sub: 'PDF, DATEV-CSV, Steuerpaket',
            onPress: () => {},
          },
        ]} />

        {/* Konto & Einstellungen */}
        <Text style={{
          fontSize: 11, fontWeight: '800', color: '#9CA3AF',
          letterSpacing: 0.8, marginLeft: 20, marginBottom: 8,
        }}>
          KONTO
        </Text>
        <MenuSection rows={[
          {
            icon: 'gear',
            label: 'Einstellungen',
            onPress: () => {},
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
            onPress: () =>
              Alert.alert('BriefPilot', `Version ${appVersion}\n\nDeine Dokumente. Dein Überblick.`),
          },
        ]} />

        {/* Abmelden */}
        <MenuSection rows={[
          {
            icon: 'log-out',
            label: 'Abmelden',
            danger: true,
            onPress: showAbmelden,
          },
        ]} />

        <Text style={{
          textAlign: 'center', fontSize: 11,
          color: '#D1D5DB', marginTop: 8,
        }}>
          BriefPilot {appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
