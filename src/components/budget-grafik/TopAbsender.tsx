/**
 * En cok harcama yapilan absender'larin top-5 listesi.
 */
import React from 'react';
import { View, Text } from 'react-native';
import type { ThemeColors } from '@/ThemeContext';
import { formatBetrag } from '@/utils';
import { TYP_FARBEN, type AbsenderGruppe } from '@/components/budget-grafik/types';

interface Props {
  absenderListe: AbsenderGruppe[];
  C: ThemeColors;
}

export default function TopAbsender({ absenderListe, C }: Props) {
  if (absenderListe.length === 0) return null;
  const palette = Object.values(TYP_FARBEN);

  return (
    <View
      style={{
        backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
        marginBottom: 16, borderWidth: 0.5, borderColor: C.border,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 12 }}>
        🏢 Höchste Ausgaben nach Absender
      </Text>
      {absenderListe.slice(0, 5).map(({ ad, betrag, anzahl }, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7,
            borderBottomWidth: i < Math.min(absenderListe.length, 5) - 1 ? 0.5 : 0,
            borderColor: C.border,
          }}
        >
          <View
            style={{
              width: 26, height: 26, borderRadius: 13,
              backgroundColor: palette[i % palette.length] + '33',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: palette[i % palette.length] }}>
              {i + 1}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: C.text, fontWeight: '500' }} numberOfLines={1}>{ad}</Text>
            <Text style={{ fontSize: 10, color: C.textTertiary }}>{anzahl} Dok.</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.danger }}>{formatBetrag(betrag)}</Text>
        </View>
      ))}
    </View>
  );
}
