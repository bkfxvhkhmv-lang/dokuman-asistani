import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { RoleCard } from './components/RoleCard';
import type { NkRole } from '@/features/vermieter/nebenkosten/guidance';

export default function NebenkostenRoleScreen() {
  const router = useRouter();
  const { Colors: C, S } = useTheme();
  const insets = useSafeAreaInsets();

  const handleRoleSelect = (role: NkRole) => {
    router.push({ pathname: '/nebenkosten/assistant', params: { role } });
  };

  return (
    <View style={[st.container, { backgroundColor: C.bg, paddingTop: insets.top }]}>
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
            icon="🏠"
            titleDe="Ich bin Vermieter"
            subtitleDe="Abrechnung erstellen und prüfen"
            onPress={() => handleRoleSelect('vermieter')}
            testID="role-card-vermieter"
          />
          <RoleCard
            icon="🔑"
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
  scroll: {
    paddingTop: 24,
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
