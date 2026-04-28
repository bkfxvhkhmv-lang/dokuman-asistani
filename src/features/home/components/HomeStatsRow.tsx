import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, type ThemeColors } from '../../../ThemeContext';
import type { ShadowTokens, SpacingTokens } from '../../../theme';

interface StatItem { n: number; label: string; color: string; tabId?: string }
interface HomeStatsRowProps {
  colors: ThemeColors;
  shadow?: ShadowTokens;
  stats: { diesenMonat?: number; wichtig?: number; mitDeadline?: number } | StatItem[];
  spacing: SpacingTokens;
  onStatPress?: (tabId: string) => void;
}

export default function HomeStatsRow({ colors: C, shadow, stats, spacing: S, onStatPress }: HomeStatsRowProps) {
  const { RiskColors, Colors, isDark } = useTheme();

  const items: StatItem[] = Array.isArray(stats) ? stats : [
    { n: (stats as any)?.diesenMonat ?? 0, label: 'Diesen Monat', color: C.primary,              tabId: 'Dokumente' },
    { n: (stats as any)?.wichtig     ?? 0, label: 'Wichtig',      color: RiskColors.hoch.color,  tabId: 'Aufgaben'  },
    { n: (stats as any)?.mitDeadline ?? 0, label: 'Fristen',      color: RiskColors.mittel.color, tabId: 'Kalender' },
  ];

  return (
    <View style={[st.row, { paddingHorizontal: S.lg, marginBottom: 12 }]}>
      {items.map(({ n, label, color, tabId }) => (
        <TouchableOpacity key={label}
          style={[st.card, { borderColor: `${C.border}D9`,
            shadowColor: Colors.text, shadowOpacity: isDark ? 0 : 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: isDark ? 0 : 2 }]}
          onPress={() => tabId && onStatPress?.(tabId)} activeOpacity={onStatPress ? 0.82 : 1}>
          <LinearGradient
            colors={[C.bgCard, `${color}14`]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[st.topAccent, { backgroundColor: color }]} />
          <Text style={[st.value, { color: n > 0 ? color : C.textTertiary }]}>{n}</Text>
          <Text style={[st.label, { color: C.textSecondary }]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  row:      { flexDirection: 'row', gap: 10 },
  card:     { flex: 1, borderRadius: 18, paddingHorizontal: 12, paddingTop: 18, paddingBottom: 14, alignItems: 'center', borderWidth: 1, overflow: 'hidden' },
  topAccent:{ position: 'absolute', left: 0, right: 0, top: 0, height: 4 },
  value:    { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  label:    { fontSize: 11, marginTop: 8, fontWeight: '600' },
});
