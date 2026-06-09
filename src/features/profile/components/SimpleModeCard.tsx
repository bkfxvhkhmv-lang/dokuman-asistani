import React from 'react';
import { Switch } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { SectionCard, SectionTitle, Row } from '@/features/profile/components/ProfileSection';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

interface SimpleProps {
  suppressSectionTitle?: boolean;
  flat?: boolean;
}

export default function SimpleModeCard({ suppressSectionTitle = false, flat = false }: SimpleProps) {
  const { Colors: C, isSimpleMode, toggleSimpleMode } = useTheme();
  const { t: T } = useT();
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
        label={T('settings.simple_mode')}
        sub={T('settings.simple_mode_sub')}
        right={sw}
      />
    );
  }
  return (
    <SectionCard color={C.success}>
      {!suppressSectionTitle ? <SectionTitle label={T('settings.simple')} color={C.success} /> : null}
      <Row
        icon="glasses-outline"
        label={T('settings.simple_mode')}
        sub={T('settings.simple_mode_sub')}
        right={sw}
      />
    </SectionCard>
  );
}
