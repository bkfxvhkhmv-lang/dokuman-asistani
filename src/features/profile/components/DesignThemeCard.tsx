/** Nur dunkles Erscheinungsbild — „Design“ unter Allgemein. */
import React from 'react';
import { Switch } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { SectionCard, SectionTitle, Row } from '@/features/profile/components/ProfileSection';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

interface DesignProps {
  suppressSectionTitle?: boolean;
  flat?: boolean;
}

export default function DesignThemeCard({ suppressSectionTitle = false, flat = false }: DesignProps) {
  const { Colors: C, isDark, toggleTheme } = useTheme();
  const sw = (
    <Switch
      value={isDark}
      onValueChange={toggleTheme}
      trackColor={{ false: C.border, true: C.primary }}
      thumbColor={isDark ? '#fff' : C.bgCard}
    />
  );
  if (flat) {
    return (
      <FlatRow icon="moon-outline" label="Dunkelmodus" right={sw} />
    );
  }
  return (
    <SectionCard color={C.primary}>
      {!suppressSectionTitle ? <SectionTitle label="DESIGN" color={C.primary} /> : null}
      <Row
        icon="moon-outline"
        label="Dunkelmodus"
        right={sw}
      />
    </SectionCard>
  );
}
