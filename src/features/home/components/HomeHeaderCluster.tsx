import React from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton } from '@/design/components';
import { useTheme } from '@/ThemeContext';

interface HomeHeaderClusterProps {
  colors: any;
  dringend: number;
  totalOpen: number;
  quickScope: 'offen' | 'alle';
  onScopeChange: (s: 'offen' | 'alle') => void;
  onSettingsPress: () => void;
  onSearchPress: () => void;
}

export default function HomeHeaderCluster({
  colors, dringend, totalOpen, quickScope, onScopeChange,
  onSettingsPress, onSearchPress,
}: HomeHeaderClusterProps) {
  const insets = useSafeAreaInsets();
  const { fs } = useTheme();

  return (
    <LinearGradient
      colors={Platform.OS === 'android'
        ? [colors.primaryLight, `${colors.primaryLight}CC`, colors.bg]
        : [`${colors.primary}22`, `${colors.primary}08`, colors.bg]}
      start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}
      style={[st.wrap, { paddingTop: Math.max(insets.top + 8, 20) }]}
    >
      {/* Top row */}
      <View style={st.topRow}>
        <View style={st.brand}>
          <View style={[st.brandMark, { backgroundColor: colors.primary }]}>
            <Text style={st.brandLetter}>B</Text>
          </View>
          <Text style={[st.appname, { color: colors.text }]}>BriefPilot</Text>
        </View>
        <View style={st.actions}>
          <AppIconButton name="magnifying-glass" onPress={onSearchPress} size={20} accessibilityLabel="Suche" />
          <AppIconButton name="gear" onPress={onSettingsPress} size={20} accessibilityLabel="Einstellungen" />
        </View>
      </View>

      {/* Metric */}
      <View style={st.metricRow}>
        <View>
          <Text style={[st.metricLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>
            Offene Dokumente
          </Text>
          <Text style={[st.metricNumber, { color: colors.text, fontSize: fs(40) }]}>
            {totalOpen}
          </Text>
        </View>
        {dringend > 0 && (
          <View style={[st.urgentBadge, { backgroundColor: `${colors.danger}18`, borderColor: `${colors.danger}30` }]}>
            <Text style={[st.urgentNum, { color: colors.danger }]}>{dringend}</Text>
            <Text style={[st.urgentLabel, { color: colors.danger }]}>dringend</Text>
          </View>
        )}
      </View>

      {/* Scope filter */}
      <View style={st.scopeRow}>
        {(['offen', 'alle'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[st.scopeChip, quickScope === s && { backgroundColor: colors.primary }]}
            onPress={() => onScopeChange(s)}
            activeOpacity={0.7}
          >
            <Text style={[st.scopeLabel, { color: quickScope === s ? '#fff' : colors.textSecondary }]}>
              {s === 'offen' ? 'Offen' : 'Alle'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  wrap:        { paddingHorizontal: 18, paddingBottom: 16 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brand:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark:   { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { color: '#fff', fontSize: 17, fontWeight: '900' },
  appname:     { fontSize: 20, fontWeight: '800', letterSpacing: -0.6 },
  actions:     { flexDirection: 'row', gap: 4 },
  metricRow:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  metricLabel: { fontWeight: '600', letterSpacing: 0.1, marginBottom: 2 },
  metricNumber: { fontWeight: '800', letterSpacing: -1.5, lineHeight: 48 },
  urgentBadge: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  urgentNum:   { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  urgentLabel: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  scopeRow:    { flexDirection: 'row', gap: 8 },
  scopeChip:   { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.07)' },
  scopeLabel:  { fontSize: 13, fontWeight: '700' },
});
