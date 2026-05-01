import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from '@/components/Icon';
import type { Dokument } from '@/store';
import type { ThemeColors } from '@/ThemeContext';
import type { RiskPalette } from '@/theme';
import { useT } from '@/hooks/useT';

interface HomeUrgencyBannerProps {
  colors: ThemeColors;
  riskColors: RiskPalette;
  document?: Dokument | null;
  daysLeft?: number | null;
  extraCount?: number;
  onPress: () => void;
}

export default function HomeUrgencyBanner({ colors: C, riskColors, document, daysLeft, extraCount = 0, onPress }: HomeUrgencyBannerProps) {
  const { t: T } = useT();
  if (!document || daysLeft == null || daysLeft > 3) return null;

  const risk = daysLeft <= 1 ? riskColors.hoch : riskColors.mittel;
  const urgencyText = daysLeft === 0 ? T('doc.today') : daysLeft === 1 ? T('doc.tomorrow') : T('doc.due_days', { n: daysLeft });

  return (
    <TouchableOpacity
      style={[st.banner, { backgroundColor: risk.bg, borderColor: risk.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[st.dot, { backgroundColor: risk.color }]} />
      <View style={st.body}>
        <Text style={[st.title, { color: C.text }]} numberOfLines={1}>{document.titel}</Text>
        <Text style={[st.sub, { color: risk.color }]}>
          {urgencyText}{extraCount > 0 ? `  ·  ${T('home.urgency_more', { n: extraCount })}` : ''}
        </Text>
      </View>
      <Icon name="chevron-forward" size={14} color={risk.color} />
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  dot:    { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  body:   { flex: 1, gap: 2 },
  title:  { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  sub:    { fontSize: 12, fontWeight: '600' },
});
