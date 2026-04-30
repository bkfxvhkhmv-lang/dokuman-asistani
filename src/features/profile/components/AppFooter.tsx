/**
 * Profil ekranının alt köşesi — logo + versiyon (açık tutar üstteki UserHeader’da).
 */
import React from 'react';
import { View, Text } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';

interface Props {
  appVersion: string;
}

export default function AppFooter({ appVersion }: Props) {
  const { Colors: C } = useTheme();
  return (
    <>
      <View style={{ alignItems: 'center', gap: 6, paddingVertical: 12 }}>
        <View
          style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: C.primaryLight,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <Icon name="sparkle" size={18} color={C.primary} weight="fill" />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '800', color: C.textSecondary, letterSpacing: -0.2 }}>
          BriefPilot
        </Text>
        <Text style={{ fontSize: 11, color: C.textTertiary, letterSpacing: 0.2 }}>
          Version {appVersion}
        </Text>
      </View>
    </>
  );
}
