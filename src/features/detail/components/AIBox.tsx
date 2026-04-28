import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '../../../components/Icon';
import { useTheme } from '../../../ThemeContext';
import type { Dokument } from '../../../store';
import type { OzetQuelle } from '../../../utils/types';

interface AIBoxProps {
  dok: Dokument | undefined;
  onMailTaslak: () => void;
  ozetQuellenSichtbar: boolean;
  setOzetQuellenSichtbar: (fn: (v: boolean) => boolean) => void;
  ozetQuellen?: OzetQuelle[];
}

export default function AIBox({ dok, onMailTaslak, ozetQuellenSichtbar, setOzetQuellenSichtbar, ozetQuellen = [] }: AIBoxProps) {
  const { Colors: C, S, R, Shadow } = useTheme();
  if (!dok) return null;

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md, borderRadius: R.lg, padding: S.lg,
      backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.primary }}>KI</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>KI-Zusammenfassung</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {dok.confidence != null && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
              backgroundColor: dok.confidence >= 80 ? C.successLight : dok.confidence >= 55 ? C.warningLight : C.dangerLight }}>
              <Text style={{ fontSize: 11, fontWeight: '700',
                color: dok.confidence >= 80 ? C.success : dok.confidence >= 55 ? C.warning : C.danger }}>
                {dok.confidence}% OCR
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={onMailTaslak}
            style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: C.textSecondary }}>📧 E-Mail</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 22 }}>{dok.zusammenfassung}</Text>

      {dok.rohText && dok.zusammenfassung && (
        <TouchableOpacity onPress={() => setOzetQuellenSichtbar(v => !v)}
          style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
            backgroundColor: ozetQuellenSichtbar ? C.primaryLight : C.bgInput,
            borderWidth: 0.5, borderColor: ozetQuellenSichtbar ? C.primary : C.border }}>
          <Icon name="search" size={16} color={ozetQuellenSichtbar ? C.primaryDark : C.textSecondary} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: ozetQuellenSichtbar ? C.primaryDark : C.textSecondary }}>
            {ozetQuellenSichtbar ? 'Quellen ausblenden' : 'Quellen anzeigen'}
          </Text>
        </TouchableOpacity>
      )}

      {ozetQuellenSichtbar && ozetQuellen.length > 0 && (
        <View style={{ marginTop: 10, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.5, marginBottom: 8 }}>QUELLTEXTE IM ORIGINALDOKUMENT</Text>
          {ozetQuellen.map((q, i) => (
            <View key={i} style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden' }}>
              <View style={{ padding: 8, backgroundColor: C.primaryLight, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.primaryDark, marginBottom: 4 }}>"{q.ozetSatz}"</Text>
                <Text style={{ fontSize: 10, color: C.textTertiary, fontStyle: 'italic', lineHeight: 15 }}>
                  Quelle: {q.quelle} ({q.konfidenz}% Übereinstimmung)
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
      {ozetQuellenSichtbar && ozetQuellen.length === 0 && (
        <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 8, fontStyle: 'italic' }}>Keine eindeutigen Quellsätze gefunden.</Text>
      )}
    </View>
  );
}
