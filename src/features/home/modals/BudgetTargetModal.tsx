import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../ThemeContext';
import { useStore } from '../../../store';
import { analyzeAllTargets, TARGET_STATUS_COLOR, type TargetAnalysis } from '../../../services/TargetService';
import { formatBetrag } from '../../../utils';
import type { BudgetTarget, Dokument } from '../../../store';

interface Props {
  visible:  boolean;
  onClose:  () => void;
  docs:     Dokument[];
}

const PRESET_TARGETS: Omit<BudgetTarget, 'limitBetrag'>[] = [
  { id: 'gesamt',      label: 'Gesamtausgaben' },
  { id: 'Rechnung',    label: 'Rechnungen' },
  { id: 'Versicherung',label: 'Versicherungen' },
  { id: 'Vertrag',     label: 'Verträge / Abos' },
];

export default function BudgetTargetModal({ visible, onClose, docs }: Props) {
  const { Colors, S, R } = useTheme();
  const { state, dispatch } = useStore();
  const insets   = useSafeAreaInsets();
  const targets  = state.einstellungen.budgetTargets ?? [];
  const analyses = analyzeAllTargets(targets, docs);

  // Local input state: map of id → text
  const [inputs, setInputs] = useState<Record<string, string>>({});

  // Sync inputs from store whenever modal opens
  useEffect(() => {
    if (!visible) return;
    const map: Record<string, string> = {};
    for (const t of targets) map[t.id] = String(t.limitBetrag);
    setInputs(map);
  }, [visible]);   // eslint-disable-line react-hooks/exhaustive-deps

  const saveTarget = (id: string, label: string, raw: string) => {
    const val = parseFloat(raw.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    const existing = targets.filter(t => t.id !== id);
    const updated  = [...existing, { id, label, limitBetrag: Math.round(val * 100) / 100 }];
    dispatch({ type: 'UPDATE_EINSTELLUNGEN', payload: { budgetTargets: updated } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const removeTarget = (id: string) => {
    const updated = targets.filter(t => t.id !== id);
    dispatch({ type: 'UPDATE_EINSTELLUNGEN', payload: { budgetTargets: updated } });
    setInputs(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const analysisFor = (id: string): TargetAnalysis | undefined =>
    analyses.find(a => a.target.id === id);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[st.root, { backgroundColor: Colors.bg }]}
      >
        {/* Handle */}
        <View style={[st.handle, { backgroundColor: Colors.border }]} />

        {/* Header */}
        <View style={st.header}>
          <Text style={[st.title, { color: Colors.text }]}>Budgetziele</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[st.closeBtn, { color: Colors.primary }]}>Fertig</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[st.scroll, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={[st.intro, { color: Colors.textSecondary }]}>
            Setze monatliche Limits. Der Assistent warnt dich, bevor du das Limit erreichst.
          </Text>

          {PRESET_TARGETS.map(preset => {
            const analysis = analysisFor(preset.id);
            const color    = analysis ? TARGET_STATUS_COLOR[analysis.status] : Colors.textTertiary;
            const hasTarget = !!targets.find(t => t.id === preset.id);

            return (
              <View
                key={preset.id}
                style={[st.row, { backgroundColor: Colors.bgCard, borderColor: Colors.border }]}
              >
                {/* Label + analysis */}
                <View style={st.rowLeft}>
                  <Text style={[st.rowLabel, { color: Colors.text }]}>{preset.label}</Text>
                  {analysis ? (
                    <Text style={[st.rowStat, { color }]}>
                      {formatBetrag(analysis.spent) ?? '–'} / {formatBetrag(analysis.target.limitBetrag) ?? '–'}
                      {' · '}{analysis.statusLabel}
                    </Text>
                  ) : (
                    <Text style={[st.rowStat, { color: Colors.textTertiary }]}>Kein Limit gesetzt</Text>
                  )}

                  {/* Progress bar */}
                  {analysis && (
                    <View style={[st.progressTrack, { backgroundColor: Colors.bgInput }]}>
                      <View style={[
                        st.progressFill,
                        {
                          width:           `${Math.min(analysis.pct * 100, 100)}%`,
                          backgroundColor: color,
                        }
                      ]} />
                      {/* Projected marker */}
                      {analysis.projectedPct < 1.5 && (
                        <View style={[
                          st.projectedMarker,
                          {
                            left:            `${Math.min(analysis.projectedPct * 100, 98)}%`,
                            backgroundColor: color,
                          }
                        ]} />
                      )}
                    </View>
                  )}

                  {analysis && (
                    <Text style={[st.velocity, { color: Colors.textTertiary }]}>
                      {analysis.velocityStr}
                    </Text>
                  )}
                </View>

                {/* Input + save */}
                <View style={st.rowRight}>
                  <View style={[st.inputWrap, { backgroundColor: Colors.bgInput, borderColor: Colors.border }]}>
                    <Text style={[st.currency, { color: Colors.textSecondary }]}>€</Text>
                    <TextInput
                      style={[st.input, { color: Colors.text }]}
                      value={inputs[preset.id] ?? ''}
                      onChangeText={v => setInputs(prev => ({ ...prev, [preset.id]: v }))}
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={() => saveTarget(preset.id, preset.label, inputs[preset.id] ?? '')}
                    />
                  </View>
                  <TouchableOpacity
                    style={[st.saveBtn, { backgroundColor: Colors.primary }]}
                    onPress={() => saveTarget(preset.id, preset.label, inputs[preset.id] ?? '')}
                  >
                    <Text style={st.saveBtnText}>↑</Text>
                  </TouchableOpacity>
                  {hasTarget && (
                    <TouchableOpacity
                      style={[st.deleteBtn, { borderColor: Colors.border }]}
                      onPress={() => removeTarget(preset.id)}
                    >
                      <Text style={[st.deleteBtnText, { color: Colors.textTertiary }]}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  root:            { flex: 1 },
  handle:          { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title:           { fontSize: 17, fontWeight: '700' },
  closeBtn:        { fontSize: 16, fontWeight: '600' },
  scroll:          { paddingHorizontal: 16, gap: 12 },
  intro:           { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  row:             { borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 0.5 },
  rowLeft:         { flex: 1, gap: 4 },
  rowLabel:        { fontSize: 14, fontWeight: '700' },
  rowStat:         { fontSize: 11, fontWeight: '600' },
  progressTrack:   { height: 5, borderRadius: 3, overflow: 'hidden', position: 'relative', marginTop: 4, marginBottom: 2 },
  progressFill:    { height: '100%', borderRadius: 3 },
  projectedMarker: { position: 'absolute', top: -2, width: 2, height: 9, borderRadius: 1 },
  velocity:        { fontSize: 10, fontWeight: '500' },
  rowRight:        { flexDirection: 'row', gap: 6, alignItems: 'center' },
  inputWrap:       { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, height: 36, width: 90 },
  currency:        { fontSize: 13, fontWeight: '600', marginRight: 2 },
  input:           { flex: 1, fontSize: 14, fontWeight: '600', padding: 0 },
  saveBtn:         { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText:     { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  deleteBtn:       { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText:   { fontSize: 11 },
});
