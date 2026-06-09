import React from 'react';
import { Switch } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { SectionCard, SectionTitle, Row } from '@/features/profile/components/ProfileSection';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

interface DesignProps {
  suppressSectionTitle?: boolean;
  flat?: boolean;
}

export default function DesignThemeCard({ suppressSectionTitle = false, flat = false }: DesignProps) {
  const { Colors: C, isDark, toggleTheme } = useTheme();
  const { t: T } = useT();
  const sw = (
    <Switch
      value={isDark}
      onValueChange={toggleTheme}
      trackColor={{ false: C.border, true: C.primary }}
      thumbColor={isDark ? '#fff' : C.bgCard}
    />
  );
  if (flat) {
    return <FlatRow icon="moon-outline" label={T('settings.dark_mode')} right={sw} />;
  }
  return (
    <SectionCard color={C.primary}>
      {!suppressSectionTitle ? <SectionTitle label={T('settings.design')} color={C.primary} /> : null}
      <Row icon="moon-outline" label={T('settings.dark_mode')} right={sw} />
    </SectionCard>
  );
}
