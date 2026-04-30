/**
 * Yil + ay seciminin uzerindeki ust ozet karti:
 *  - Toplam (yil)
 *  - Aylik ortalama
 *  Hem "ay degisince" hem "yil degisince" AnimatedCounter ile gecis yapar.
 */
import React from 'react';
import { View, Text } from 'react-native';
import type { ThemeColors } from '@/ThemeContext';
import { formatBetrag } from '@/utils';
import AnimatedCounter from '@/components/budget-grafik/AnimatedCounter';

interface Props {
  seciliYil:    number;
  gesamtBetrag: number;
  C:            ThemeColors;
}

export default function SummaryHeader({ seciliYil, gesamtBetrag, C }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: C.dangerLight, borderRadius: 14, padding: 14,
        marginBottom: 16, borderWidth: 0.5, borderColor: C.danger + '44',
      }}
    >
      <View>
        <Text style={{ fontSize: 11, color: C.textTertiary }}>Gesamt {seciliYil}</Text>
        <AnimatedCounter
          value={gesamtBetrag}
          formatter={formatBetrag as (v: number) => string}
          style={{ fontSize: 22, fontWeight: '800', color: C.danger }}
        />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 11, color: C.textTertiary }}>Ø pro Monat</Text>
        <AnimatedCounter
          value={gesamtBetrag / 12}
          formatter={formatBetrag as (v: number) => string}
          style={{ fontSize: 16, fontWeight: '700', color: C.text }}
        />
      </View>
    </View>
  );
}
