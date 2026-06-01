/**
 * Antwort-Assistent v1 — Finanzamt only.
 *
 * Replaces the old generic template picker.
 * Non-Finanzamt documents get an explicit "not yet supported" notice.
 *
 * Modes (all deterministic in v1, no LLM):
 *   1. Frist wahren       — short protective draft, no LLM
 *   2. Klärung anfordern  — clarification request, no LLM
 *   3. Begründeter Entwurf — detailed draft with up to 3 questions, no LLM in v1
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  TextInput, Share, StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import { HIT_SLOP_LG } from '@/theme';
import type { Dokument } from '@/store';
import {
  analyzeFinanzamt,
  buildFristWahrenDraft,
  buildKlaerungDraft,
  buildBegruendetDraft,
  type FinanzamtAnalysis,
} from '@/features/detail/services/finanzamtAnalysis';

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = 'frist_wahren' | 'klaerung' | 'begruendet';
type Screen = 'mode_selection' | 'questions' | 'draft';

interface BegruendetAnswers {
  hasNachweis?: boolean;
  istBeruflich?: boolean;
  zusatzinfo?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  dok?: Dokument;
}

// ── Mode definitions ──────────────────────────────────────────────────────────

const MODES: Array<{
  id: Mode;
  label: string;
  subtitle: string;
  icon: string;
}> = [
  {
    id: 'frist_wahren',
    label: 'Frist wahren',
    subtitle: 'Kurz reagieren und Zeit gewinnen. Eine ausführliche Begründung kann später ergänzt werden.',
    icon: 'clock',
  },
  {
    id: 'klaerung',
    label: 'Klärung anfordern',
    subtitle: 'Fordere eine verständliche Begründung, Berechnung oder fehlende Unterlagen an.',
    icon: 'question',
  },
  {
    id: 'begruendet',
    label: 'Begründeter Entwurf',
    subtitle: 'Erstelle einen ausführlicheren Entwurf mit deinen Angaben und Nachweisen.',
    icon: 'pencil-line',
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Handle({ C }: { C: any }) {
  return (
    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
  );
}

function Disclaimer({ C }: { C: any }) {
  return (
    <View style={{ marginHorizontal: 16, marginVertical: 8, padding: 10, borderRadius: 10, backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning }}>
      <Text style={{ fontSize: 11, color: C.warningText }}>
        Entwurf · Keine Rechtsberatung — bitte [Platzhalter] ersetzen und Angaben prüfen.
      </Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function YanıtSablonlariModal({ visible, onClose, dok }: Props) {
  const { Colors: C, S, R } = useTheme();

  const analysis = useMemo(() => (dok ? analyzeFinanzamt(dok) : null), [dok]);

  const [screen, setScreen] = useState<Screen>('mode_selection');
  const [mode, setMode] = useState<Mode | null>(null);
  const [answers, setAnswers] = useState<BegruendetAnswers>({});
  const [draft, setDraft] = useState<{ empfaenger: string; betreff: string; text: string } | null>(null);
  const [editText, setEditText] = useState('');

  const reset = () => {
    setScreen('mode_selection');
    setMode(null);
    setAnswers({});
    setDraft(null);
    setEditText('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleModeSelect = (m: Mode) => {
    setMode(m);
    if (!analysis) return;

    if (m === 'frist_wahren') {
      const d = buildFristWahrenDraft(analysis);
      setDraft(d);
      setEditText(d.text);
      setScreen('draft');
    } else if (m === 'klaerung') {
      const d = buildKlaerungDraft(analysis);
      setDraft(d);
      setEditText(d.text);
      setScreen('draft');
    } else {
      // Begründeter Entwurf — ask questions first
      setScreen('questions');
    }
  };

  const handleQuestionsComplete = () => {
    if (!analysis) return;
    const d = buildBegruendetDraft(analysis, answers);
    setDraft(d);
    setEditText(d.text);
    setScreen('draft');
  };

  const handleKopieren = async () => {
    await Clipboard.setStringAsync(editText);
  };

  const handleTeilen = async () => {
    await Share.share({ message: editText, title: draft?.betreff ?? 'Entwurf' });
  };

  // ── Non-Finanzamt fallback ─────────────────────────────────────────────────

  if (analysis && !analysis.isFinanzamt) {
    return (
      <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={st.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={[st.sheet, { backgroundColor: C.bgCard }]}>
          <Handle C={C} />
          <View style={{ paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center' }}>
            <Icon name="info" size={36} color={C.textTertiary} style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: 10 }}>
              Antwort-Assistent
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              Der Antwort-Assistent ist in dieser Version zunächst für Finanzamt-Schreiben verfügbar.
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={HIT_SLOP_LG}
              style={{ paddingVertical: 12, paddingHorizontal: 28, borderRadius: R.lg, backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={st.backdrop} onPress={handleClose} activeOpacity={1} />
      <View style={[st.sheet, { backgroundColor: C.bgCard }]}>
        <Handle C={C} />

        {/* ── Mode selection ── */}
        {screen === 'mode_selection' && analysis && (
          <>
            {/* Back button slot (none on first screen) + title */}
            <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>
                Wie möchten Sie antworten?
              </Text>
            </View>

            {/* Analysis summary */}
            <View style={{ marginHorizontal: 16, marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon name="identification-badge" size={14} color={C.textTertiary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary }}>
                  FINANZAMT — ANALYSE
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 17 }}>
                {analysis.zusammenfassung}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {MODES.map(m => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => handleModeSelect(m.id)}
                  style={[st.modeCard, { backgroundColor: C.bgCard, borderColor: C.border }]}
                  activeOpacity={0.75}
                >
                  <View style={[st.modeIconWrap, { backgroundColor: C.primaryLight }]}>
                    <Icon name={m.icon} size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{m.label}</Text>
                    <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 3, lineHeight: 16 }}>
                      {m.subtitle}
                    </Text>
                  </View>
                  <Icon name="caret-right" size={14} color={C.border} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Begründeter Entwurf: questions ── */}
        {screen === 'questions' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16, gap: 10 }}>
              <TouchableOpacity onPress={() => setScreen('mode_selection')} hitSlop={HIT_SLOP_LG}>
                <Text style={{ fontSize: 15, color: C.primary }}>← Zurück</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.text }}>
                Begründeter Entwurf
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {/* Q1 */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 }}>
                Haben Sie einen Nachweis für diese Ausgabe?
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[
                  { val: true, label: 'Ja, Belege vorhanden' },
                  { val: false, label: 'Nein / unsicher' },
                ].map(opt => (
                  <TouchableOpacity
                    key={String(opt.val)}
                    onPress={() => setAnswers(a => ({ ...a, hasNachweis: opt.val }))}
                    style={[st.answerBtn, {
                      backgroundColor: answers.hasNachweis === opt.val ? C.primaryLight : C.bgInput,
                      borderColor: answers.hasNachweis === opt.val ? C.primary : C.border,
                    }]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: answers.hasNachweis === opt.val ? C.primaryDark : C.textSecondary }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Q2 */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 }}>
                War diese Ausgabe beruflich oder betrieblich veranlasst?
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[
                  { val: true, label: 'Ja, beruflich' },
                  { val: false, label: 'Privat / unklar' },
                ].map(opt => (
                  <TouchableOpacity
                    key={String(opt.val)}
                    onPress={() => setAnswers(a => ({ ...a, istBeruflich: opt.val }))}
                    style={[st.answerBtn, {
                      backgroundColor: answers.istBeruflich === opt.val ? C.primaryLight : C.bgInput,
                      borderColor: answers.istBeruflich === opt.val ? C.primary : C.border,
                    }]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: answers.istBeruflich === opt.val ? C.primaryDark : C.textSecondary }}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Q3 */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 }}>
                Weitere Angaben (optional)
              </Text>
              <TextInput
                value={answers.zusatzinfo ?? ''}
                onChangeText={v => setAnswers(a => ({ ...a, zusatzinfo: v }))}
                placeholder="z. B. Art der Ausgabe, besondere Umstände"
                placeholderTextColor={C.textTertiary}
                style={[st.textInput, { backgroundColor: C.bgInput, borderColor: C.border, color: C.text }]}
                multiline
                numberOfLines={3}
              />

              {/* Recommendation if no evidence */}
              {answers.hasNachweis === false && (
                <View style={{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning }}>
                  <Text style={{ fontSize: 12, color: C.warningText, lineHeight: 17 }}>
                    Ohne Nachweis empfehlen wir zunächst „Frist wahren" oder „Klärung anfordern".
                    Ein vollständiger Einspruch ist trotzdem möglich — bitte im Entwurf entsprechend ergänzen.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleQuestionsComplete}
                style={[st.primaryBtn, { backgroundColor: C.primary, marginTop: 24 }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Entwurf erstellen</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        )}

        {/* ── Draft output ── */}
        {screen === 'draft' && draft && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4, gap: 10 }}>
              <TouchableOpacity
                onPress={() => mode === 'begruendet' ? setScreen('questions') : setScreen('mode_selection')}
                hitSlop={HIT_SLOP_LG}
              >
                <Text style={{ fontSize: 15, color: C.primary }}>← Zurück</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.text }}>
                {MODES.find(m => m.id === mode)?.label ?? 'Entwurf'}
              </Text>
            </View>

            {/* Meta: Empfänger + Betreff */}
            <View style={{ marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
              <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 2 }}>Empfänger</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 }}>{draft.empfaenger}</Text>
              <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 2 }}>Betreff</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{draft.betreff}</Text>
            </View>

            <Disclaimer C={C} />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <TextInput
                value={editText}
                onChangeText={setEditText}
                style={[st.draftInput, { backgroundColor: C.bgInput, borderColor: C.border, color: C.text }]}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
              <TouchableOpacity
                onPress={handleKopieren}
                style={[st.secondaryBtn, { borderColor: C.primary, backgroundColor: C.primaryLight, flex: 1 }]}
              >
                <Icon name="clipboard-text" size={16} color={C.primaryDark} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.primaryDark }}>Kopieren</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTeilen}
                style={[st.primaryBtn, { backgroundColor: C.primary, flex: 1 }]}
              >
                <Icon name="share-network" size={16} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Teilen</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%', paddingBottom: 24,
  },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14, marginBottom: 10,
    borderWidth: 0.5,
  },
  modeIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  answerBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1.5, alignItems: 'center',
  },
  textInput: {
    borderRadius: 10, borderWidth: 1, padding: 12,
    fontSize: 13, minHeight: 80, textAlignVertical: 'top',
  },
  draftInput: {
    borderRadius: 12, borderWidth: 1, padding: 14,
    fontSize: 13, lineHeight: 20, minHeight: 300,
  },
  primaryBtn: {
    borderRadius: 12, padding: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  secondaryBtn: {
    borderRadius: 12, padding: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    borderWidth: 1.5,
  },
});
