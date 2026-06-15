import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import type { Dokument } from '@/store';
import { HIT_SLOP_LG, NAV_HIT_TARGET } from '@/theme';

interface SimStep { icon: string; text: string }
interface SimResult {
  title: string;
  steps: SimStep[];
  risk: string;
  riskLabel: string;
  note: string;
}

function simulateLocally(action: string, dok: Dokument, T: (key: string, vars?: Record<string, string | number>) => string): SimResult {
  const amount = dok.betrag ? `${dok.betrag.toFixed(2)} €` : T('action_sim.default_amount');
  const sender = dok.absender || T('action_sim.default_sender');

  const scenarios: Record<string, SimResult> = {
    zahlen: {
      title: T('action_sim.pay.title'),
      steps: [
        { icon: '', text: T('action_sim.pay.step_1', { amount, sender }) },
        { icon: '', text: T('action_sim.pay.step_2') },
        { icon: '', text: T('action_sim.pay.step_3') },
        { icon: '', text: T('action_sim.pay.step_4') },
      ],
      risk: 'low',
      riskLabel: T('action_sim.risk.low'),
      note: T('action_sim.pay.note'),
    },
    einspruch: {
      title: T('action_sim.appeal.title'),
      steps: [
        { icon: '', text: T('action_sim.appeal.step_1') },
        { icon: '', text: T('action_sim.appeal.step_2') },
        { icon: '', text: T('action_sim.appeal.step_3') },
        { icon: '', text: T('action_sim.appeal.step_4') },
        { icon: '', text: T('action_sim.appeal.step_5') },
      ],
      risk: 'medium',
      riskLabel: T('action_sim.risk.medium'),
      note: T('action_sim.appeal.note'),
    },
    ignorieren: {
      title: T('action_sim.ignore.title'),
      steps: [
        { icon: '', text: T('action_sim.ignore.step_1') },
        { icon: '', text: T('action_sim.ignore.step_2', { amount }) },
        { icon: '', text: T('action_sim.ignore.step_3') },
        { icon: '', text: T('action_sim.ignore.step_4') },
        { icon: '', text: T('action_sim.ignore.step_5') },
      ],
      risk: 'high',
      riskLabel: T('action_sim.risk.high'),
      note: T('action_sim.ignore.note'),
    },
    erledigt: {
      title: T('action_sim.done.title'),
      steps: [
        { icon: '', text: T('action_sim.done.step_1') },
        { icon: '', text: T('action_sim.done.step_2') },
        { icon: '', text: T('action_sim.done.step_3') },
        { icon: '', text: T('action_sim.done.step_4') },
      ],
      risk: 'none',
      riskLabel: T('action_sim.risk.none'),
      note: T('action_sim.done.note'),
    },
  };

  return scenarios[action] ?? {
    title: action,
    steps: [{ icon: '', text: T('action_sim.unknown') }],
    risk: 'unknown',
    riskLabel: T('display.fallback.unknown'),
    note: '',
  };
}

const ACTIONS = [
  { id: 'zahlen', labelKey: 'action_sim.action.pay', emoji: '' },
  { id: 'einspruch', labelKey: 'action_sim.action.appeal', emoji: '' },
  { id: 'ignorieren', labelKey: 'action_sim.action.ignore', emoji: '' },
  { id: 'erledigt', labelKey: 'action_sim.action.done', emoji: '' },
];

const RISK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  low:     { bg: '#E8F5E9', border: '#43A047', text: '#1B5E20' },
  medium:  { bg: '#FFF3E0', border: '#FB8C00', text: '#E65100' },
  high:    { bg: '#FFEBEE', border: '#E53935', text: '#B71C1C' },
  none:    { bg: '#F5F5F5', border: '#9E9E9E', text: '#424242' },
  unknown: { bg: '#F5F5F5', border: '#9E9E9E', text: '#424242' },
};

interface ActionSimulatorModalProps {
  visible: boolean;
  onClose: () => void;
  dok: Dokument;
}

export default function ActionSimulatorModal({ visible, onClose, dok }: ActionSimulatorModalProps) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const { t: T } = useT();
  const [selected, setSelected] = useState<string | null>(null);

  const result = selected ? simulateLocally(selected, dok, T) : null;
  const riskColor = result ? (RISK_COLORS[result.risk] ?? RISK_COLORS.unknown) : null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[st.container, { backgroundColor: C.bg }]}>
        <View style={[st.header, { borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={HIT_SLOP_LG} style={st.headerAction}>
            <Text style={{ fontSize: 15, color: C.primary, fontWeight: '500' }}>{T('common.close')}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{T('action_sim.title')}</Text>
          <View style={st.headerAction} />
        </View>
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: S.lg, lineHeight: 20 }}>
            {T('action_sim.subtitle')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: S.lg }}>
            {ACTIONS.map((action) => {
              const active = selected === action.id;
              return (
                <TouchableOpacity
                  key={action.id}
                  onPress={() => setSelected(action.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: active ? C.primary : C.bgCard,
                    borderWidth: 1.5,
                    borderColor: active ? C.primary : C.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : C.text }}>{T(action.labelKey)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {result && riskColor ? (
            <View style={{ borderRadius: R.lg, backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, overflow: 'hidden', ...Shadow.sm }}>
              <View style={{ padding: S.md, backgroundColor: C.primaryLight }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.primaryDark }}>{result.title}</Text>
              </View>
              <View style={{ paddingHorizontal: S.md, paddingTop: S.md }}>
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: riskColor.bg, borderWidth: 1, borderColor: riskColor.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: riskColor.text }}>{result.riskLabel}</Text>
                </View>
              </View>
              <View style={{ padding: S.md, gap: 10 }}>
                {result.steps.map((step, index) => (
                  <View key={index} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.bgInput, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.textTertiary }} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 20, paddingTop: 4 }}>{step.text}</Text>
                  </View>
                ))}
              </View>
              {result.note ? (
                <View style={{ marginHorizontal: S.md, marginBottom: S.md, padding: 10, borderRadius: 10, backgroundColor: C.warningLight }}>
                  <Text style={{ fontSize: 11, color: C.warningText, lineHeight: 17 }}>{`Empfehlung: ${result.note}`}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {!selected ? (
            <View style={{ alignItems: 'center', padding: 30 }}>
              <Text style={{ fontSize: 13, color: C.textTertiary, textAlign: 'center' }}>
                {T('action_sim.empty')}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  headerAction: { minWidth: NAV_HIT_TARGET, minHeight: NAV_HIT_TARGET, alignItems: 'center', justifyContent: 'center' },
});
