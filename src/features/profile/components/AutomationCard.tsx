/**
 * Automatisierung — Verknüpfung zum Regel-/Marktplatz-Bereich.
 */
import React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { SectionCard, SectionTitle, Row } from '@/features/profile/components/ProfileSection';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

interface Props {
  onOpenRegelmarkt: () => void;
  flat?: boolean;
}

export default function AutomationCard({ onOpenRegelmarkt, flat = false }: Props) {
  const { Colors: C } = useTheme();
  if (flat) {
    return (
      <FlatRow
        icon="flash-outline"
        label="Regelmarkt öffnen"
        sub="Automatische Aktionsketten verwalten"
        onPress={onOpenRegelmarkt}
        right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
      />
    );
  }
  return (
    <SectionCard color={C.warning}>
      <SectionTitle label="AUTOMATISIERUNG" color={C.warning} />
      <TouchableOpacity onPress={onOpenRegelmarkt}>
        <Row
          icon="flash-outline"
          label="Regelmarkt öffnen"
          sub="Automatische Aktionsketten verwalten"
          right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
        />
      </TouchableOpacity>
    </SectionCard>
  );
}
