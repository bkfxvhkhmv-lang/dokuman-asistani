import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../ThemeContext';
import type { Aufgabe } from '../../../store';
import type { AufgabenVorschlag } from '../../../utils/types';

interface TasksPanelProps {
  aufgaben?: Aufgabe[];
  offeneAufgaben?: number;
  vorschlaege?: AufgabenVorschlag[];
  onToggle: (a: Aufgabe) => void;
  onAdd: (v: AufgabenVorschlag) => void;
  onOpenAddModal: () => void;
}

export default function TasksPanel({
  aufgaben = [],
  offeneAufgaben = 0,
  vorschlaege = [],
  onToggle,
  onAdd,
  onOpenAddModal,
}: TasksPanelProps) {
  const { Colors: C, S, R, Shadow } = useTheme();

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary }}>AUFGABEN</Text>
        <TouchableOpacity onPress={onOpenAddModal}
          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.primary }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.primaryDark }}>+ Aufgabe</Text>
        </TouchableOpacity>
      </View>

      {aufgaben.map((a, i) => (
        <TouchableOpacity key={i} onPress={() => onToggle(a)}
          style={{ borderRadius: R.lg, padding: S.md, marginBottom: 6,
            backgroundColor: a.erledigt ? C.successLight : C.bgCard,
            borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: a.erledigt ? C.success : C.text }}>
            {a.erledigt ? '✓ ' : ''}{a.titel}
          </Text>
        </TouchableOpacity>
      ))}

      {vorschlaege.length > 0 && (
        <>
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, marginTop: 10, marginBottom: 6 }}>VORSCHLÄGE</Text>
          {vorschlaege.map((v, i) => (
            <TouchableOpacity key={i} onPress={() => onAdd(v)}
              style={{ borderRadius: R.lg, padding: S.md, marginBottom: 6, backgroundColor: C.primaryLight, borderWidth: 0.5, borderColor: C.primary }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.primaryDark }}>+ {v.titel}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 8 }}>Offene Aufgaben: {offeneAufgaben}</Text>
    </View>
  );
}
