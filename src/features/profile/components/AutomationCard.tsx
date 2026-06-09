import React from 'react';
import { TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { SectionCard, SectionTitle, Row } from '@/features/profile/components/ProfileSection';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

interface Props {
  onOpenRegelmarkt: () => void;
  flat?: boolean;
}

export default function AutomationCard({ onOpenRegelmarkt, flat = false }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  if (flat) {
    return (
      <FlatRow icon="flash-outline"
        label={T('settings.automation')}
        sub={T('settings.automation_sub')}
        onPress={onOpenRegelmarkt}
        right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
      />
    );
  }
  return (
    <SectionCard color={C.warning}>
      <SectionTitle label={T('settings.advanced').toUpperCase()} color={C.warning} />
      <TouchableOpacity onPress={onOpenRegelmarkt}>
        <Row icon="flash-outline"
          label={T('settings.automation')}
          sub={T('settings.automation_sub')}
          right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
        />
      </TouchableOpacity>
    </SectionCard>
  );
}
