import React from 'react';
import { ScrollView, Text, View, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { HIT_SLOP_LG, NAV_HIT_TARGET } from '@/theme';
import Icon from '@/components/Icon';
import { RoleCard } from './components/RoleCard';
import type { NkRole } from '@/features/vermieter/nebenkosten/guidance';

export default function NebenkostenRoleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sourceDokId?: string }>();
  const { Colors: C, S } = useTheme();
  const insets = useSafeAreaInsets();
  const sourceDokId = (params.sourceDokId ?? '').trim();

  const handleBack = () => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/einstellungen');
  };

  const handleRoleSelect = (role: NkRole) => {
    router.push({
      pathname: '/nebenkosten/assistant',
      params: sourceDokId ? { role, sourceDokId } : { role },
    });
  };

  return (
    <View style={[st.container, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={[st.header, { borderBottomColor: C.borderLight, paddingHorizontal: S.lg }]}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
          hitSlop={HIT_SLOP_LG}
          style={st.headerAction}
        >
          <Icon name="arrow-left" size={20} color={C.textSecondary} />
          <Text style={[st.headerActionText, { color: C.textSecondary }]}>Zurück</Text>
        </Pressable>
        <View style={st.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          st.scroll,
          { paddingHorizontal: S.lg, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[st.title, { color: C.text }]}>Nebenkosten</Text>
        <Text style={[st.subtitle, { color: C.textSecondary }]}>
          Wählen Sie Ihre Perspektive aus, um passende Hinweise zu erhalten.
        </Text>

        <View style={st.cards}>
          <RoleCard
            icon="V"
            titleDe="Ich bin Vermieter"
            subtitleDe="Abrechnung erstellen und prüfen"
            onPress={() => handleRoleSelect('vermieter')}
            testID="role-card-vermieter"
          />
          <RoleCard
            icon="M"
            titleDe="Ich bin Mieter"
            subtitleDe="Abrechnung prüfen und Rückfragen vorbereiten"
            onPress={() => handleRoleSelect('mieter')}
            testID="role-card-mieter"
          />
        </View>

        <Text style={[st.disclaimer, { color: C.textTertiary }]}>
          Rechen- und Strukturhilfe. Keine Rechtsberatung.
        </Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    minHeight: NAV_HIT_TARGET + 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: {
    minWidth: NAV_HIT_TARGET,
    minHeight: NAV_HIT_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerSpacer: {
    width: NAV_HIT_TARGET,
    minWidth: NAV_HIT_TARGET,
    minHeight: NAV_HIT_TARGET,
  },
  scroll: {
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  cards: {
    gap: 12,
    marginBottom: 24,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
  },
});
