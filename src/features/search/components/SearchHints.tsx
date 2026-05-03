/**
 * Aramaya iliskin yardimci ipuclari ve modlar:
 *  - V4 banner (semantik mod aktif + agirlik secimi)
 *  - Parsed hint chips ("über 100€", "diese Woche" tespitleri)
 *  - Smart intent badge ve sure
 *  - Yazim duzeltme onerisi ("Meinten Sie...")
 *  - V4 hata banner
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from '@/components/Icon';
import type { ThemeColors } from '@/ThemeContext';

/* -------------------------------------------------------------------------- */
/* V4 mode banner                                                             */
/* -------------------------------------------------------------------------- */

interface V4BannerProps {
  ftsWeight: number;
  setFtsWeight: (v: number) => void;
  C: ThemeColors;
  S: any;
}

export function V4Banner({ ftsWeight, setFtsWeight, C, S }: V4BannerProps) {
  return (
    <View
      style={{
        marginHorizontal: S.md, marginBottom: 6, borderRadius: 10, padding: 10,
        backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.primary + '44',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: C.primaryDark }}>
        Semantische Suche aktiv (V4)
      </Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {([['Text', 0.7], ['Mix', 0.5], ['Semantik', 0.3]] as [string, number][]).map(([label, val]) => (
          <TouchableOpacity
            key={label}
            onPress={() => setFtsWeight(val)}
            style={{
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
              backgroundColor: ftsWeight === val ? C.primary : 'transparent',
            }}
          >
            <Text style={{ fontSize: 10, color: ftsWeight === val ? '#fff' : C.primaryDark, fontWeight: '600' }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Parsed hint chips                                                          */
/* -------------------------------------------------------------------------- */

interface ParsedHintsProps {
  hints: string[];
  C: ThemeColors;
  S: any;
}

export function ParsedHints({ hints, C, S }: ParsedHintsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ paddingHorizontal: S.md, marginBottom: 6 }}
    >
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: C.textTertiary }}>Erkannt:</Text>
        {hints.map((h, i) => (
          <View
            key={i}
            style={{ paddingHorizontal: 10, paddingVertical: 3, backgroundColor: C.primaryLight, borderRadius: 999 }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: C.primaryDark }}>{h}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/* Intent badge + processing time                                             */
/* -------------------------------------------------------------------------- */

interface IntentBadgeProps {
  label: string;
  processingMs: number;
  C: ThemeColors;
  S: any;
}

export function IntentBadge({ label, processingMs, C, S }: IntentBadgeProps) {
  return (
    <View style={{ marginHorizontal: S.md, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View
        style={{
          paddingHorizontal: 10, paddingVertical: 3,
          backgroundColor: C.primaryLight, borderRadius: 999,
          borderWidth: 1, borderColor: C.primary + '44',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="sparkle" size={10} color={C.primaryDark} weight="fill" />
          <Text style={{ fontSize: 10, fontWeight: '800', color: C.primaryDark }}>{label}</Text>
        </View>
      </View>
      {__DEV__ && processingMs > 0 && (
        <Text style={{ fontSize: 9, color: C.textTertiary }}>{processingMs}ms</Text>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Spelling correction hint                                                   */
/* -------------------------------------------------------------------------- */

interface CorrectionHintProps {
  hint: string;
  onApply: () => void;
  C: ThemeColors;
  S: any;
}

export function CorrectionHint({ hint, onApply, C, S }: CorrectionHintProps) {
  return (
    <TouchableOpacity onPress={onApply} style={{ marginHorizontal: S.md, marginBottom: 6 }}>
      <Text style={{ fontSize: 12, color: C.primary }}>
        Meinten Sie: <Text style={{ fontWeight: '700' }}>{hint}</Text>?
      </Text>
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------------------- */
/* V4 error banner                                                            */
/* -------------------------------------------------------------------------- */

interface V4ErrorProps {
  error: string;
  C: ThemeColors;
  S: any;
}

export function V4Error({ error, C, S }: V4ErrorProps) {
  return (
    <View
      style={{
        marginHorizontal: S.md, marginBottom: 6, borderRadius: 10, padding: 8,
        backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="warning-circle" size={13} color={C.warningText} />
        <Text style={{ fontSize: 11, color: C.warningText }}>{error}</Text>
      </View>
    </View>
  );
}
