import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { HIT_SLOP_LG } from '@/theme';
import Icon from '@/components/Icon';
import type { OzetKarte } from '@/utils/types';

interface Props {
  kartlar: OzetKarte[];
  onOzetAktion?: (aktion: string) => void;
  /** Gleiche Aktion schon als FAB / Kalender-Streifen — Button ausblenden, Karte bleibt informativ */
  suppressAktionKey?: string | null;
}

export default function OzetKarteListe({ kartlar, onOzetAktion, suppressAktionKey }: Props) {
  const { Colors: C, S, R, Shadow } = useTheme();
  if (kartlar.length === 0) return null;

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8, marginBottom: 8 }}>KURZÜBERSICHT</Text>
      {kartlar.map((karte, i) => (
        <View key={i} style={{ borderRadius: R.md, padding: S.md, marginBottom: 8,
          backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name={karte.icon} size={20} color={C.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{karte.titel}</Text>
              <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{karte.inhalt}</Text>
            </View>
            {karte.aktion && karte.aktionLabel && karte.aktion !== suppressAktionKey && (
              <TouchableOpacity onPress={() => onOzetAktion?.(karte.aktion!)}
                hitSlop={HIT_SLOP_LG}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: C.primary }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{karte.aktionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
