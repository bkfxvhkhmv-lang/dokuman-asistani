import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { SendProfile } from '@/features/detail/services/documentActionFlows';

interface Props {
  profile: SendProfile;
}

export default function KommunikationskanalKarte({ profile }: Props) {
  const { Colors: C, S, R } = useTheme();

  const channelLabel = useMemo(() => profile.preferredChannel === 'email' ? 'E-Mail'
    : profile.preferredChannel === 'web' ? 'Webformular'
      : profile.preferredChannel === 'post' ? 'Post' : 'Unbekannt', [profile.preferredChannel]);

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.md,
      backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: `${C.primary}33` }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.primaryDark, letterSpacing: 0.8, marginBottom: 4 }}>EMPFOHLENER KOMMUNIKATIONSKANAL</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: C.primaryDark }}>{channelLabel}</Text>
      {profile.requiresAttachment && (
        <Text style={{ fontSize: 11, color: C.primary, marginTop: 4 }}>Anhang erforderlich</Text>
      )}
    </View>
  );
}
