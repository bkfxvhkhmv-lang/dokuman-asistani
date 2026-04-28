import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import type { Dokument } from '../store';

interface SimStep { icon: string; text: string }
interface SimResult {
  title: string;
  steps: SimStep[];
  risk: string;
  riskLabel: string;
  note: string;
}

function simulateLocally(action: string, dok: Dokument): SimResult {
  const betrag   = dok.betrag ? `${dok.betrag.toFixed(2)} €` : 'angegebenen Betrag';
  const absender = dok.absender || 'Behörde';

  const scenarios: Record<string, SimResult> = {
    zahlen: {
      title: '💶 Wenn Sie zahlen',
      steps: [
        { icon: '✅', text: `${betrag} wird an ${absender} überwiesen.` },
        { icon: '📋', text: 'Der Vorgang wird abgeschlossen und die Akte archiviert.' },
        { icon: '📧', text: 'In der Regel erhalten Sie eine Zahlungsbestätigung.' },
        { icon: '🔒', text: 'Rechtliche Schritte werden vermieden.' },
      ],
      risk: 'low', riskLabel: 'Geringes Risiko',
      note: 'Eine Zahlung ist in den meisten Fällen die schnellste Lösung.',
    },
    einspruch: {
      title: '✍️ Wenn Sie Einspruch einlegen',
      steps: [
        { icon: '📝', text: 'Sie schreiben einen Widerspruch und senden ihn an die Behörde.' },
        { icon: '⏳', text: 'Die Behörde prüft den Einspruch (kann 2–8 Wochen dauern).' },
        { icon: '📬', text: 'Die Behörde kann die Entscheidung überprüfen oder ablehnen.' },
        { icon: '⚖️', text: 'Bei Ablehnung können Sie das Verwaltungsgericht einschalten.' },
        { icon: '💡', text: 'Haben Sie recht, kann die Zahlung oder Strafe reduziert werden.' },
      ],
      risk: 'medium', riskLabel: 'Mittleres Risiko',
      note: 'Das Widerspruchsverfahren kann lange dauern. Anwaltliche Beratung empfohlen.',
    },
    ignorieren: {
      title: '🚫 Wenn Sie ignorieren',
      steps: [
        { icon: '⚠️', text: 'Eine zweite oder letzte Mahnung wird versendet.' },
        { icon: '💸', text: `Verzugszinsen und Zusatzkosten häufen sich an (ca. ${betrag} + 1 %/Monat).` },
        { icon: '📬', text: 'Ein Inkasso- oder Mahnverfahren wird eingeleitet.' },
        { icon: '🏛️', text: 'Vollstreckungsbescheid → Risiko der Pfändung von Lohn oder Konto.' },
        { icon: '❌', text: 'Ein negativer Schufa-Eintrag ist möglich.' },
      ],
      risk: 'high', riskLabel: 'Hohes Risiko',
      note: 'Ignorieren führt in den meisten Fällen zum schlechtesten Ergebnis.',
    },
    erledigt: {
      title: '✓ Als erledigt markieren',
      steps: [
        { icon: '✅', text: 'Das Dokument wird ins Archiv verschoben.' },
        { icon: '🔕', text: 'Keine weiteren Erinnerungen für dieses Dokument.' },
        { icon: '📊', text: 'Wird in Ihrer Statistik berücksichtigt.' },
        { icon: '↩️', text: 'Sie können dies jederzeit rückgängig machen.' },
      ],
      risk: 'none', riskLabel: 'Kein Risiko',
      note: 'Markieren Sie nur als erledigt, wenn der Vorgang wirklich abgeschlossen ist.',
    },
  };

  return scenarios[action] ?? {
    title: action,
    steps: [{ icon: '❓', text: 'Keine Simulationsdaten für diese Aktion verfügbar.' }],
    risk: 'unknown', riskLabel: 'Unbekannt', note: '',
  };
}

const ACTIONS = [
  { id: 'zahlen',     label: 'Bezahlen',              emoji: '💶' },
  { id: 'einspruch',  label: 'Einspruch einlegen',     emoji: '✍️' },
  { id: 'ignorieren', label: 'Ignorieren',             emoji: '🚫' },
  { id: 'erledigt',   label: 'Als erledigt markieren', emoji: '✅' },
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
  const [selected, setSelected] = useState<string | null>(null);

  const result    = selected ? simulateLocally(selected, dok) : null;
  const riskColor = result ? (RISK_COLORS[result.risk] ?? RISK_COLORS.unknown) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[st.container, { backgroundColor: C.bg }]}>
        <View style={[st.header, { borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 15, color: C.primary, fontWeight: '500' }}>✕ Schließen</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>🤖 Aktionssimulator</Text>
          <View style={{ width: 72 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: S.lg, lineHeight: 20 }}>
            Wählen Sie eine Aktion — die KI simuliert das wahrscheinlichste Ergebnis für dieses Dokument.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: S.lg }}>
            {ACTIONS.map(a => {
              const active = selected === a.id;
              return (
                <TouchableOpacity key={a.id} onPress={() => setSelected(a.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                    backgroundColor: active ? C.primary : C.bgCard,
                    borderWidth: 1.5, borderColor: active ? C.primary : C.border }}>
                  <Text style={{ fontSize: 16 }}>{a.emoji}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : C.text }}>{a.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {result && riskColor && (
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
                {result.steps.map((step, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.bgInput, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14 }}>{step.icon}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 20, paddingTop: 4 }}>{step.text}</Text>
                  </View>
                ))}
              </View>
              {result.note ? (
                <View style={{ marginHorizontal: S.md, marginBottom: S.md, padding: 10, borderRadius: 10, backgroundColor: C.warningLight }}>
                  <Text style={{ fontSize: 11, color: C.warningText, lineHeight: 17 }}>💡 {result.note}</Text>
                </View>
              ) : null}
            </View>
          )}
          {!selected && (
            <View style={{ alignItems: 'center', padding: 30 }}>
              <Text style={{ fontSize: 32, marginBottom: 10 }}>🤖</Text>
              <Text style={{ fontSize: 13, color: C.textTertiary, textAlign: 'center' }}>
                Wählen Sie oben eine Aktion, um zu sehen, welche Konsequenzen sie für dieses Dokument hat.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
});
