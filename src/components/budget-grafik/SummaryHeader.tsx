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
  modus: 'monat' | 'jahr';
  seciliYil:    number;
  seciliAyName: string;
  gesamtBetrag: number;
  jahresDurchschnitt: number;
  jahresDokumentAnzahl: number;
  seciliAyBetrag: number;
  seciliAyDokumentAnzahl: number;
  C:            ThemeColors;
}

export default function SummaryHeader({
  modus,
  seciliYil,
  seciliAyName,
  gesamtBetrag,
  jahresDurchschnitt,
  jahresDokumentAnzahl,
  seciliAyBetrag,
  seciliAyDokumentAnzahl,
  C,
}: Props) {
  const istJahr = modus === 'jahr';
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
        <Text style={{ fontSize: 11, color: C.textTertiary }}>
          {istJahr ? `Jahresübersicht ${seciliYil}` : `Monatsübersicht ${seciliAyName} ${seciliYil}`}
        </Text>
        <AnimatedCounter
          value={istJahr ? gesamtBetrag : seciliAyBetrag}
          formatter={formatBetrag as (v: number) => string}
          style={{ fontSize: 22, fontWeight: '800', color: C.danger }}
        />
        <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 4 }}>
          {istJahr ? `${jahresDokumentAnzahl} Dokumente mit Betrag` : `${seciliAyDokumentAnzahl} Dokumente mit Betrag`}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {istJahr ? (
          <>
            <Text style={{ fontSize: 11, color: C.textTertiary }}>Ø pro Monat</Text>
            <AnimatedCounter
              value={jahresDurchschnitt}
              formatter={formatBetrag as (v: number) => string}
              style={{ fontSize: 16, fontWeight: '700', color: C.text }}
            />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 11, color: C.textTertiary }}>Gesamt</Text>
            <AnimatedCounter
              value={seciliAyBetrag}
              formatter={formatBetrag as (v: number) => string}
              style={{ fontSize: 16, fontWeight: '700', color: C.text }}
            />
          </>
        )}
      </View>
    </View>
  );
}
