import React, { Fragment } from 'react';
import { Switch, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { SectionCard, SectionTitle, Row } from '@/features/profile/components/ProfileSection';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

interface Props {
  pushEnabled:    boolean;
  setPushEnabled: (v: boolean) => void;
  weeklySummary:    boolean;
  setWeeklySummary: (v: boolean) => void;
  partnerEmail:    string;
  onOpenPartnerEmail: () => void;
  omitSectionTitle?: boolean;
  flat?: boolean;
}

export default function NotificationsCard({
  pushEnabled, setPushEnabled,
  weeklySummary, setWeeklySummary,
  partnerEmail, onOpenPartnerEmail,
  omitSectionTitle = false,
  flat = false,
}: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();

  const fristSW = (
    <Switch value={pushEnabled} trackColor={{ false: C.border, true: C.primary }}
      thumbColor={pushEnabled ? '#fff' : C.bgCard} onValueChange={setPushEnabled} />
  );
  const weeklySW = (
    <Switch value={weeklySummary} trackColor={{ false: C.border, true: C.primary }}
      thumbColor={weeklySummary ? '#fff' : C.bgCard} onValueChange={setWeeklySummary} />
  );

  if (flat) {
    return (
      <Fragment>
        <FlatRow icon="notifications-outline" label={T('settings.notif_deadline')} right={fristSW} />
        <FlatRow
          icon="mail-outline"
          label={T('settings.notif_partner_email')}
          sub={partnerEmail || T('settings.notif_not_set')}
          right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
          onPress={onOpenPartnerEmail}
        />
        <FlatRow icon="calendar-outline" label={T('settings.notif_weekly')} right={weeklySW} />
      </Fragment>
    );
  }
  return (
    <SectionCard color={C.primary}>
      {!omitSectionTitle ? <SectionTitle label={T('settings.notifications').toUpperCase()} color={C.primary} /> : null}
      <Row icon="notifications-outline" label={T('settings.notif_deadline')} right={fristSW} />
      <TouchableOpacity onPress={onOpenPartnerEmail}>
        <Row icon="mail-outline" label={T('settings.notif_partner_email')}
          sub={partnerEmail || T('settings.notif_not_set')}
          right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />} />
      </TouchableOpacity>
      <Row icon="calendar-outline" label={T('settings.notif_weekly')} right={weeklySW} />
    </SectionCard>
  );
}
