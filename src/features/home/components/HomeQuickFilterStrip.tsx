import React from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type QuickScope = 'alle' | 'offen' | 'ueberfaellig';

const CHIPS: { key: QuickScope; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'offen', label: 'Offen' },
  { key: 'ueberfaellig', label: 'Überfällig' },
];

type Props = {
  scope: QuickScope;
  onChange: (s: QuickScope) => void;
  colors: {
    bg: string;
    bgCard: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    primaryLight?: string;
  };
};

export default function HomeQuickFilterStrip({ scope, onChange, colors: C }: Props) {
  return (
    <View style={[styles.wrap, { backgroundColor: C.bg, borderBottomColor: `${C.border}AA` }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {CHIPS.map(c => {
          const active = scope === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => onChange(c.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? (C.primaryLight ?? `${C.primary}22`) : C.bgCard,
                  borderColor: active ? `${C.primary}77` : C.border,
                },
              ]}
            >
              <Text style={[styles.chipTxt, { color: active ? C.primary : C.text, fontWeight: active ? '800' : '600' }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTxt: { fontSize: 13 },
});
