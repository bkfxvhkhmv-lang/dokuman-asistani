import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type Theme = {
  bgInput: string;
  border: string;
  primary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
};

type Props = {
  yillar: number[];
  seciliYil: number;
  onSelectYil: (y: number) => void;
  C: Theme;
};

/** Üst başlık satırı: başlık + yıl seçiciler */
export default function BudgetYearStrip({ yillar, seciliYil, onSelectYil, C }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}> Ausgaben-Übersicht</Text>
        <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>Nur Dokumente mit Betrag</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {yillar.map(y => (
          <TouchableOpacity
            key={y}
            onPress={() => onSelectYil(y)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
              backgroundColor: y === seciliYil ? C.primary : C.bgInput,
              borderWidth: 0.5,
              borderColor: y === seciliYil ? C.primary : C.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: y === seciliYil ? '#fff' : C.textSecondary }}>
              {y}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
