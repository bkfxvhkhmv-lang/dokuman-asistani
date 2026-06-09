import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { ActionHistoryEntry } from '@/store';

interface Props {
  eintraege: ActionHistoryEntry[];
}

export default function AktionenVerlauf({ eintraege }: Props) {
  const { Colors: C, S, R, Shadow } = useTheme();
  if (eintraege.length === 0) return null;

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.md,
      backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, marginBottom: 10 }}>AKTIONSVERLAUF</Text>
      {eintraege.map((entry, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
          borderBottomWidth: i < eintraege.length - 1 ? 0.5 : 0, borderBottomColor: C.border }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>{entry.label}</Text>
            <Text style={{ fontSize: 10, color: C.textTertiary }}>{entry.timeline}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
