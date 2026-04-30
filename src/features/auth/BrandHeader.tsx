/**
 * BriefPilot logosu + isim + alt baslik.
 * Klavye acikken `compact` true gecirilirse boyutlanir.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { authStyles as st } from '@/features/auth/styles';

interface Props {
  compact?: boolean;
}

export default function BrandHeader({ compact = false }: Props) {
  const { Colors: C } = useTheme();
  return (
    <View style={[st.header, compact && st.headerCompact]}>
      <View style={[st.logoBadge, { backgroundColor: C.primary }]}>
        <View style={st.logoFrame} />
        <Text style={st.logoPlane}>➤</Text>
        <Text style={st.logoSpark}>✦</Text>
      </View>
      <Text style={[st.title, { color: C.text }]}>BriefPilot</Text>
      <Text style={[st.subtitle, { color: C.textSecondary }]}>
        Ihre Dokumente. Immer im Griff.
      </Text>
    </View>
  );
}
