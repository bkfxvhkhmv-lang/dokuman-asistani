/**
 * Secili ayin dokumanlarini listeleyen kart — top 6 belgeyi gosterir,
 * fazlasi varsa "+N weitere" satir altina sigdirilir.
 */
import React from 'react';
import { View, Text } from 'react-native';
import type { ThemeColors } from '@/ThemeContext';
import { formatBetrag } from '@/utils';
import { TYP_IKON } from '@/components/budget-grafik/types';
import type { Dokument } from '@/store';

interface Props {
  ayName:       string;
  ayBetrag:     number;
  seciliAyDocs: Dokument[];
  C:            ThemeColors;
}

export default function SeciliAyDetay({ ayName, ayBetrag, seciliAyDocs, C }: Props) {
  if (ayBetrag <= 0) return null;

  return (
    <View
      style={{
        backgroundColor: C.bgInput, borderRadius: 14, padding: 14,
        marginBottom: 16, borderWidth: 0.5, borderColor: C.primary + '44',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{ayName}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.danger }}>
          {formatBetrag(ayBetrag)}
        </Text>
      </View>
      {seciliAyDocs.slice(0, 6).map((d, i) => (
        <View
          key={d.id}
          style={{
            flexDirection: 'row', justifyContent: 'space-between',
            alignItems: 'center', paddingVertical: 5,
            borderTopWidth: i === 0 ? 0 : 0.5, borderColor: C.border,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: C.text }} numberOfLines={1}>
              {TYP_IKON[d.typ] || '📂'} {d.absender || d.titel || d.typ}
            </Text>
            <Text style={{ fontSize: 10, color: C.textTertiary }}>{d.typ}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: C.text }}>
            {formatBetrag(d.betrag ?? 0)}
          </Text>
        </View>
      ))}
      {seciliAyDocs.length > 6 && (
        <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 6, textAlign: 'center' }}>
          +{seciliAyDocs.length - 6} weitere
        </Text>
      )}
    </View>
  );
}
