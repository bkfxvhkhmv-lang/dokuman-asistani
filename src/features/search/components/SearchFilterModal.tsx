/**
 * Gelismis arama filtre modal'i — bottom-sheet tarzi sunum.
 *
 * Filtreler:
 *  - Betrag araliği (min/max EUR)
 *  - Zeitraum (von/bis tarih)
 *  - Dokumenttip (TYPEN'den secim)
 *  - Risikolevel (RISIKEN'den secim)
 *  - "Erledigte einschließen" toggle
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AppInput } from '@/design/components';
import Icon from '@/components/Icon';
import type { ThemeColors } from '@/ThemeContext';
import SpringChip from '@/features/search/components/SpringChip';
import { TYPEN, RISIKEN } from '@/features/search/components/constants';
import { useT } from '@/hooks/useT';

interface Props {
  visible: boolean;
  onClose: () => void;
  onReset: () => void;

  minBetrag: string; setMinBetrag: (v: string) => void;
  maxBetrag: string; setMaxBetrag: (v: string) => void;
  vonDatum:  string; setVonDatum:  (v: string) => void;
  bisDatum:  string; setBisDatum:  (v: string) => void;
  typ:       string; setTyp:       (v: string) => void;
  risiko:    string; setRisiko:    (v: string) => void;
  mitErledigt: boolean;
  setMitErledigt: (fn: (v: boolean) => boolean) => void;

  C: ThemeColors;
}

export default function SearchFilterModal({
  visible, onClose, onReset,
  minBetrag, setMinBetrag, maxBetrag, setMaxBetrag,
  vonDatum,  setVonDatum,  bisDatum,  setBisDatum,
  typ, setTyp, risiko, setRisiko,
  mitErledigt, setMitErledigt,
  C,
}: Props) {
  const { t: T } = useT();
  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />

      <View
        style={{
          backgroundColor: C.bgCard,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: 40,
        }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 20 }}>
          {T('search.advanced')}
        </Text>

        {/* BETRAG */}
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>
          BETRAG (€)
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <AppInput label="Von (€)" placeholder="z. B. 50" value={minBetrag} onChangeText={setMinBetrag} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput label="Bis (€)" placeholder="z. B. 500" value={maxBetrag} onChangeText={setMaxBetrag} keyboardType="numeric" />
          </View>
        </View>

        {/* ZEITRAUM */}
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>
          ZEITRAUM
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <AppInput label="Von" placeholder="2024-01-01" value={vonDatum} onChangeText={setVonDatum} />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput label="Bis" placeholder="2024-12-31" value={bisDatum} onChangeText={setBisDatum} />
          </View>
        </View>

        {/* DOKUMENTTYP */}
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>
          DOKUMENTTYP
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TYPEN.map(t => (
              <SpringChip
                key={t}
                onPress={() => setTyp(t)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                  borderWidth: 1,
                  borderColor:     typ === t ? C.primary : C.border,
                  backgroundColor: typ === t ? C.primaryLight : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: typ === t ? '700' : '400',
                    color:      typ === t ? C.primaryDark : C.textSecondary,
                  }}
                >
                  {t === 'alle' ? 'Alle' : t}
                </Text>
              </SpringChip>
            ))}
          </View>
        </ScrollView>

        {/* RISIKOLEVEL */}
        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>
          RISIKOLEVEL
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {RISIKEN.map(r => {
            const rColor =
              r === 'hoch'    ? '#e53935' :
              r === 'mittel'  ? '#f57c00' :
              r === 'niedrig' ? '#2e7d32' : C.primary;
            const isActive = risiko === r;
            return (
              <SpringChip
                key={r}
                onPress={() => setRisiko(r)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
                  borderWidth: 1,
                  borderColor:     isActive ? rColor : C.border,
                  backgroundColor: isActive ? rColor + '22' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isActive ? '700' : '400',
                    color:      isActive ? rColor : C.textSecondary,
                  }}
                >
                  {r === 'alle' ? 'Alle' : r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </SpringChip>
            );
          })}
        </View>

        {/* Erledigte einschließen */}
        <TouchableOpacity
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingVertical: 10,
            borderTopWidth: 0.5, borderTopColor: C.border,
            marginBottom: 20,
          }}
          onPress={() => setMitErledigt(v => !v)}
        >
          <View
            style={{
              width: 22, height: 22, borderRadius: 6,
              borderWidth: 1.5,
              borderColor:     mitErledigt ? C.primary : C.border,
              backgroundColor: mitErledigt ? C.primary : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {mitErledigt && <Icon name="check" size={13} color="#fff" weight="bold" />}
          </View>
          <Text style={{ fontSize: 14, color: C.text }}>{T('search.include_done')}</Text>
        </TouchableOpacity>

        {/* Reset / Anwenden */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={{
              flex: 1, borderRadius: 12, padding: 14,
              alignItems: 'center', borderWidth: 1, borderColor: C.danger,
            }}
            onPress={onReset}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: C.danger }}>Zurücksetzen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 2, borderRadius: 12, padding: 14,
              alignItems: 'center', backgroundColor: C.primary,
            }}
            onPress={onClose}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Anwenden</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
