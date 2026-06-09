/**
 * Dokumenttipi yatay bar — toplam icindeki yuzde + adet ozeti.
 */
import React from 'react';
import { View, Text } from 'react-native';
import type { ThemeColors } from '@/ThemeContext';
import { formatBetrag } from '@/utils';
import { TYP_FARBEN, TYP_IKON, type TypGruppe } from '@/components/budget-grafik/types';

interface Props extends TypGruppe {
  gesamtBetrag: number;
  C: ThemeColors;
}

export default function TypBalken({ typ, betrag, gesamtBetrag, anzahl, C }: Props) {
  const prozent = gesamtBetrag > 0 ? Math.round((betrag / gesamtBetrag) * 100) : 0;
  const farbe = TYP_FARBEN[typ] || '#A5B1C2';
  const ikon  = TYP_IKON[typ]   || '📂';

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 14 }}>{ikon}</Text>
          <Text style={{ fontSize: 13, color: C.text, fontWeight: '500' }}>{typ}</Text>
          <View
            style={{
              backgroundColor: farbe + '22',
              borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
            }}
          >
            <Text style={{ fontSize: 10, color: farbe, fontWeight: '700' }}>{anzahl}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{formatBetrag(betrag)}</Text>
          <Text style={{ fontSize: 10, color: C.textTertiary }}>{prozent}%</Text>
        </View>
      </View>
      <View style={{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${prozent}%`, backgroundColor: farbe, borderRadius: 4 }} />
      </View>
    </View>
  );
}
