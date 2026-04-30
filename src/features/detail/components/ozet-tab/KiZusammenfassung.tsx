import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { HIT_SLOP_LG } from '@/theme';
import type { OzetQuelle } from '@/utils/types';

interface Props {
  zusammenfassung: string;
  rohTextPresent: boolean;
  ozetQuellenSichtbar: boolean;
  setOzetQuellenSichtbar: (fn: (v: boolean) => boolean) => void;
  quellenEintraege: OzetQuelle[];
  onMailTaslak: () => void;
}

export default function KiZusammenfassung({
  zusammenfassung,
  rohTextPresent,
  ozetQuellenSichtbar,
  setOzetQuellenSichtbar,
  quellenEintraege,
  onMailTaslak,
}: Props) {
  const { Colors: C, S, R, Shadow } = useTheme();

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.md,
      backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8 }}>KI-ZUSAMMENFASSUNG</Text>
        <TouchableOpacity onPress={() => onMailTaslak()}
          hitSlop={HIT_SLOP_LG}
          style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: C.textSecondary }}>📧 E-Mail</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 20 }}>{zusammenfassung}</Text>
      {rohTextPresent && (
        <TouchableOpacity onPress={() => setOzetQuellenSichtbar(v => !v)}
          hitSlop={HIT_SLOP_LG}
          style={{ marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
            backgroundColor: ozetQuellenSichtbar ? C.primaryLight : C.bgInput,
            borderWidth: 0.5, borderColor: ozetQuellenSichtbar ? C.primary : C.border }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: ozetQuellenSichtbar ? C.primaryDark : C.textSecondary }}>
            {ozetQuellenSichtbar ? 'Quellen ausblenden' : 'Quellen anzeigen'}
          </Text>
        </TouchableOpacity>
      )}
      {ozetQuellenSichtbar && quellenEintraege.map((q, i) => (
        <View key={i} style={{ marginTop: 8, padding: 8, backgroundColor: C.primaryLight, borderRadius: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.primaryDark, marginBottom: 4 }}>{`"${q.ozetSatz}"`}</Text>
          <Text style={{ fontSize: 10, color: C.textTertiary, fontStyle: 'italic' }}>
            Quelle: {q.quelle} ({q.konfidenz}%)
          </Text>
        </View>
      ))}
    </View>
  );
}
