import React, { Fragment } from 'react';
import { Switch, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { SectionCard, SectionTitle, Row } from '@/features/profile/components/ProfileSection';
import { FlatRow } from '@/features/settings/SettingsPrimitives';

interface Props {
  docCount:      number;
  loading:       boolean;
  autoBackup:    boolean;
  setAutoBackup: (v: boolean) => void;
  onExport:      () => void;
  onImport:      () => void;
  flat?: boolean;
}

export default function BackupCard({
  docCount, loading, autoBackup, setAutoBackup, onExport, onImport, flat = false,
}: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  const autoSw = (
    <Switch value={autoBackup} trackColor={{ false: C.border, true: C.success }}
      thumbColor={autoBackup ? '#fff' : C.bgCard} onValueChange={setAutoBackup} />
  );
  if (flat) {
    return (
      <Fragment>
        <FlatRow icon="document-text-outline"
          label={T('settings.backup_export')}
          sub={T('settings.backup_docs_sub', { n: docCount })}
          right={<Icon name="share-outline" size={16} color={C.textTertiary} />}
          onPress={onExport} disabled={loading} />
        <FlatRow icon="folder-open-outline"
          label={T('settings.backup_import')}
          sub={T('settings.backup_restore_sub')}
          right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />}
          onPress={onImport} disabled={loading} />
        <FlatRow icon="refresh-outline" label={T('settings.backup_auto')} right={autoSw} />
      </Fragment>
    );
  }
  return (
    <SectionCard color={C.success}>
      <SectionTitle label={T('settings.data').toUpperCase()} color={C.success} />
      <TouchableOpacity onPress={onExport} disabled={loading}>
        <Row icon="document-text-outline"
          label={T('settings.backup_export')}
          sub={T('settings.backup_docs_sub', { n: docCount })}
          right={<Icon name="share-outline" size={16} color={C.textTertiary} />} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onImport} disabled={loading}>
        <Row icon="folder-open-outline"
          label={T('settings.backup_import')}
          sub={T('settings.backup_restore_sub')}
          right={<Icon name="chevron-forward" size={16} color={C.textTertiary} />} />
      </TouchableOpacity>
      <Row icon="refresh-outline" label={T('settings.backup_auto')} right={autoSw} />
    </SectionCard>
  );
}
