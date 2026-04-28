import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from '../../../components/Icon';
import type { Dokument } from '../../../store';
import type { ThemeColors } from '../../../ThemeContext';
import type { RiskPalette } from '../../../theme';

interface HomeUrgencyBannerProps {
  colors: ThemeColors;
  riskColors: RiskPalette;
  document?: Dokument | null;
  daysLeft?: number | null;
  extraCount?: number;
  onPress: () => void;
}

export default function HomeUrgencyBanner({ colors: C, riskColors, document, daysLeft, extraCount = 0, onPress }: HomeUrgencyBannerProps) {
  if (!document || daysLeft == null || daysLeft > 3) return null;

  const risk = daysLeft <= 1 ? riskColors.hoch : riskColors.mittel;
  const urgencyText = daysLeft === 0 ? 'HEUTE fällig' : daysLeft === 1 ? 'Morgen fällig' : `Noch ${daysLeft} Tage`;

  return (
    <TouchableOpacity style={[st.banner, { backgroundColor: risk.bg, borderColor: risk.border, shadowColor: risk.color }]}
      onPress={onPress} activeOpacity={0.86}>
      <View style={[st.topAccent, { backgroundColor: risk.color }]} />
      <View style={[st.leadingIcon, { backgroundColor: `${risk.color}12`, borderColor: `${risk.color}22` }]}>
        <Icon name="time-outline" size={18} color={risk.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.eyebrow, { color: risk.text }]}>AKTIVE FRIST</Text>
        <Text style={[st.title, { color: C.text }]} numberOfLines={1}>{document.titel}</Text>
        <Text style={[st.subtitle, { color: risk.color }]}>
          {urgencyText}{extraCount > 0 ? ` · +${extraCount} weitere${extraCount > 1 ? '' : 's'}` : ''}
        </Text>
      </View>
      <View style={[st.chevronWrap, { borderColor: `${risk.color}30` }]}>
        <Icon name="chevron-forward" size={14} color={risk.color} />
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  banner:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4, overflow: 'hidden' },
  topAccent:  { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  leadingIcon:{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  eyebrow:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginBottom: 5 },
  title:      { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  subtitle:   { fontSize: 13, fontWeight: '700', marginTop: 4 },
  chevronWrap:{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
