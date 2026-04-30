/** Einfacher Modus — größere Schrift nur Start + Detail wie beschrieben. */
import React from 'react';
import { Switch } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { SectionCard, SectionTitle, Row } from '@/features/profile/components/ProfileSection';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

interface SimpleProps {
  suppressSectionTitle?: boolean;
  flat?: boolean;
}

export default function SimpleModeCard({ suppressSectionTitle = false, flat = false }: SimpleProps) {
  const { Colors: C, isSimpleMode, toggleSimpleMode } = useTheme();
  const sw = (
    <Switch
      value={isSimpleMode}
      onValueChange={toggleSimpleMode}
      trackColor={{ false: C.border, true: C.success }}
      thumbColor={isSimpleMode ? '#fff' : C.bgCard}
    />
  );
  if (flat) {
    return (
      <FlatRow
        icon="glasses-outline"
        label="Einfacher Modus"
        sub="Größere Schrift auf Start- und Dokumentdetail."
        right={sw}
      />
    );
  }
  return (
    <SectionCard color={C.success}>
      {!suppressSectionTitle ? <SectionTitle label="EINFACH" color={C.success} /> : null}
      <Row
        icon="glasses-outline"
        label="Einfacher Modus"
        sub="Mehr Luft und größere Schrift nur auf Start- und Dokumentdetail. Übersicht statt mehrerer Reiter dort."
        right={sw}
      />
    </SectionCard>
  );
}
