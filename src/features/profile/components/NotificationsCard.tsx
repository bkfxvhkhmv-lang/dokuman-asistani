/**
 * Bildirim ayarlari karti — push, partner-email, weekly summary.
 */
import React, { Fragment } from 'react';
import { Switch, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { SectionCard, SectionTitle, Row } from '@/features/profile/components/ProfileSection';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

interface Props {
  pushEnabled:    boolean;
  setPushEnabled: (v: boolean) => void;

  weeklySummary:    boolean;
  setWeeklySummary: (v: boolean) => void;

  partnerEmail:    string;
  onOpenPartnerEmail: () => void;
  /** Übergeordnete Screen-Überschrift nutzen */
  omitSectionTitle?: boolean;
  /** Flache Zeilen — in {@link FlatGroup} einlegen. */
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
  const fristSW = (
    <Switch
      value={pushEnabled}
      trackColor={{ false: C.border, true: C.primary }}
      thumbColor={pushEnabled ? '#fff' : C.bgCard}
      onValueChange={setPushEnabled}
    />
  );
  const weeklySW = (
    <Switch
      value={weeklySummary}
      trackColor={{ false: C.border, true: C.primary }}
      thumbColor={weeklySummary ? '#fff' : C.bgCard}
      onValueChange={setWeeklySummary}
    />
  );
  if (flat) {
    return (
      <Fragment>
        <FlatRow icon="notifications-outline" label="Frist-Erinnerung" right={fristSW} />
        <FlatRow
          icon="mail-outline"
          label="Partner-E-Mail"
          sub={partnerEmail || 'Noch nicht gesetzt'}
          right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
          onPress={onOpenPartnerEmail}
        />
        <FlatRow icon="calendar-outline" label="Wöchentliche Zusammenfassung" right={weeklySW} />
      </Fragment>
    );
  }
  return (
    <SectionCard color={C.primary}>
      {!omitSectionTitle ? <SectionTitle label="BENACHRICHTIGUNGEN" color={C.primary} /> : null}

      <Row
        icon="notifications-outline"
        label="Frist-Erinnerung"
        right={fristSW}
      />

      <TouchableOpacity onPress={onOpenPartnerEmail}>
        <Row
          icon="mail-outline"
          label="Partner-E-Mail"
          sub={partnerEmail || 'Noch nicht gesetzt'}
          right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
        />
      </TouchableOpacity>

      <Row
        icon="calendar-outline"
        label="Wöchentliche Zusammenfassung"
        right={weeklySW}
      />
    </SectionCard>
  );
}
