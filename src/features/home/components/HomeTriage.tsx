import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { getTageVerbleibend } from '@/utils/formatters';
import { isLowConfidence } from '@/utils/documentGuards';
import type { Dokument } from '@/store';

interface Props {
  docs: Dokument[];
  onPress?: (scope: 'dringend' | 'dieseWoche' | 'pruefen' | 'ueberfaellig') => void;
  onScanPress?: () => void;
}

interface TriageItem {
  key: 'dringend' | 'dieseWoche' | 'pruefen' | 'ueberfaellig';
  label: string;
  icon: string;
  count: number;
  tone: 'danger' | 'warning' | 'neutral';
}

export default function HomeTriage({ docs, onPress, onScanPress }: Props) {
  const { Colors: C, S, R } = useTheme();

  const items = useMemo((): TriageItem[] => {
    let dringend = 0, dieseWoche = 0, pruefen = 0, ueberfaellig = 0;

    for (const d of docs) {
      if (d.erledigt) continue;
      const tage = d.frist ? getTageVerbleibend(d.frist) : null;
      if (tage !== null && tage < 0)          ueberfaellig++;
      if (tage !== null && tage >= 0 && tage <= 7) dieseWoche++;
      if (d.risiko === 'hoch')                dringend++;
      if (isLowConfidence(d))                 pruefen++;
    }

    return [
      { key: 'dringend',     label: 'Dringend',       icon: 'warning-circle', count: dringend,     tone: dringend > 0     ? 'danger'  : 'neutral' },
      { key: 'ueberfaellig', label: 'Überfällig',     icon: 'clock',          count: ueberfaellig, tone: ueberfaellig > 0 ? 'danger'  : 'neutral' },
      { key: 'dieseWoche',   label: 'Diese Woche',    icon: 'calendar-blank', count: dieseWoche,   tone: dieseWoche > 0   ? 'warning' : 'neutral' },
      { key: 'pruefen',      label: 'Angaben prüfen', icon: 'magnifying-glass',count: pruefen,     tone: pruefen > 0      ? 'warning' : 'neutral' },
    ];
  }, [docs]);

  const allZero = items.every(i => i.count === 0);
  if (allZero) {
    return (
      <View style={{ marginHorizontal: S.md, marginBottom: S.md,
        paddingHorizontal: S.lg, paddingVertical: 14, borderRadius: R.lg,
        backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.borderLight }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="check-circle" size={18} color={C.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>
              Keine dringenden Dokumente
            </Text>
            <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2, lineHeight: 15 }}>
              Aktuell gibt es keine überfälligen Fristen oder offenen Prüfungen.
            </Text>
          </View>
        </View>
        {onScanPress && (
          <TouchableOpacity
            onPress={onScanPress}
            style={{ marginTop: 12, paddingVertical: 9, borderRadius: 8,
              backgroundColor: `${C.primary}0D`, borderWidth: 1, borderColor: `${C.primary}22`,
              alignItems: 'center' }}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.primary }}>
              Neues Dokument scannen
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function toneStyle(tone: TriageItem['tone']) {
    if (tone === 'danger')  return { bg: C.dangerLight,  border: `${C.danger}44`,  count: C.danger,  label: C.danger  };
    if (tone === 'warning') return { bg: C.warningLight, border: `${C.warning}44`, count: C.warning, label: C.warning };
    return                         { bg: C.bgCard,       border: C.borderLight,    count: C.textTertiary, label: C.textTertiary };
  }

  const visibleItems = items.filter(i => i.count > 0);

  return (
    <View style={[st.wrap, { marginHorizontal: S.md, marginBottom: S.md }]}>
      <Text style={[st.header, { color: C.textTertiary }]}>HEUTE WICHTIG</Text>
      <View style={st.grid}>
        {visibleItems.map(item => {
          const ts = toneStyle(item.tone);
          return (
            <TouchableOpacity
              key={item.key}
              style={[st.cell, { backgroundColor: ts.bg, borderColor: ts.border }]}
              onPress={() => onPress?.(item.key)}
              activeOpacity={0.75}
            >
              <Icon name={item.icon} size={18} color={ts.count} style={{ marginBottom: 6 }} />
              <Text style={[st.count, { color: ts.count }]}>{item.count}</Text>
              <Text style={[st.label, { color: ts.label }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:   {},
  header: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  grid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell:   {
    flex: 1, minWidth: '45%', borderRadius: 14, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 12,
    alignItems: 'center',
  },
  count:  { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  label:  { fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },
});
