/**
 * Profil ekraninin ust kullanici karti — avatar + email + ozet + cikis.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';

interface Props {
  email:    string;
  docCount: number;
  totalOpenAmount: number;
  onLogout: () => void;
}

export default function UserHeader({ email, docCount, totalOpenAmount, onLogout }: Props) {
  const { Colors: C, Shadow, fs } = useTheme();
  return (
    <View
      style={{
        backgroundColor: C.bgCard, borderRadius: 20, padding: 20,
        ...Shadow.sm,
        borderWidth: 1, borderColor: C.borderLight,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View
          style={{
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: C.primaryLight,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: `${C.primary}33`,
          }}
        >
          <Icon name="person" size={24} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fs(16), fontWeight: '800', color: C.text, letterSpacing: -0.3 }}>
            {email || 'Gast'}
          </Text>
          <Text style={{ fontSize: fs(12), color: C.textTertiary, marginTop: 3, letterSpacing: 0.1 }}>
            {docCount} Dokumente · {totalOpenAmount > 0 ? `${totalOpenAmount.toFixed(2)} € offen` : 'Kein offener Betrag'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onLogout}
        style={{
          marginTop: 16, paddingVertical: 10, borderRadius: 12,
          borderWidth: 1, borderColor: C.dangerBorder,
          alignItems: 'center', backgroundColor: C.dangerLight,
        }}
      >
        <Text style={{ color: C.danger, fontSize: fs(13), fontWeight: '600', letterSpacing: 0.1 }}>
          Abmelden
        </Text>
      </TouchableOpacity>
    </View>
  );
}
