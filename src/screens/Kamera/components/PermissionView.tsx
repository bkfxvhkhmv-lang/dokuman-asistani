import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '../../../components/Icon';
import { useTheme } from '../../../ThemeContext';

interface Props {
  onRequest: () => void;
}

export default function PermissionView({ onRequest }: Props) {
  const { Colors: C } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: C.bg, paddingHorizontal: 40 }}>
      <View style={{ width: 80, height: 80, borderRadius: 28, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Icon name="camera-outline" size={36} color={C.primary} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, textAlign: 'center', letterSpacing: -0.4 }}>
        Kamerazugriff
      </Text>
      <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22 }}>
        Um Dokumente zu scannen, benötigt BriefPilot Zugriff auf Ihre Kamera.
      </Text>
      <TouchableOpacity
        style={{ marginTop: 12, backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center' }}
        onPress={onRequest}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Kamera erlauben</Text>
      </TouchableOpacity>
    </View>
  );
}
