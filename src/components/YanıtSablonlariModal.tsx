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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
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
import { useT } from '@/hooks/useT';

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

const MODE_IDS: Mode[] = ['frist_wahren', 'klaerung', 'begruendet'];
const MODE_ICONS: Record<Mode, string> = {
  frist_wahren: 'clock',
  klaerung:     'question',
  begruendet:   'pencil-line',
};
const MODE_LABEL_KEY: Record<Mode, string> = {
  frist_wahren: 'reply.fristWahren.label',
  klaerung:     'reply.klaerung.label',
  begruendet:   'reply.begruendet.label',
};
const MODE_SUBTITLE_KEY: Record<Mode, string> = {
  frist_wahren: 'reply.fristWahren.subtitle',
  klaerung:     'reply.klaerung.subtitle',
  begruendet:   'reply.begruendet.subtitle',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Handle({ C }: { C: any }) {
  return (
    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
  );
}

function Disclaimer({ C, disclaimer }: { C: any; disclaimer: string }) {
  return (
    <View style={{ marginHorizontal: 16, marginVertical: 8, padding: 10, borderRadius: 10, backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning }}>
      <Text style={{ fontSize: 11, color: C.warningText }}>
        {disclaimer}
      </Text>
    </View>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Main component ────────────────────────────────────────────────────────────

export default function YanıtSablonlariModal({ visible, onClose, dok }: Props) {
  const { Colors: C, S, R } = useTheme();
  const { t: T } = useT();

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

  const handleSavePdf = async () => {
    if (!draft || !analysis) return;

    const azLine = analysis.aktenzeichen ? `<div><strong>Aktenzeichen:</strong> ${escapeHtml(analysis.aktenzeichen)}</div>` : '';
    const stNrLine = analysis.steuernummer ? `<div><strong>Steuernummer:</strong> ${escapeHtml(analysis.steuernummer)}</div>` : '';
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><style>
      body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1a1a2e;background:#fff;padding:32px}
      .wrap{max-width:760px;margin:0 auto}
      .label{font-size:11px;font-weight:700;letter-spacing:.4px;color:#8a8fa6;margin-bottom:6px}
      .header{border-bottom:1px solid #e6e8f0;padding-bottom:18px;margin-bottom:18px}
      .title{font-size:22px;font-weight:800;margin:0 0 8px}
      .meta{font-size:13px;line-height:1.7;color:#3d4458}
      .disclaimer{margin:18px 0;padding:10px 12px;border:1px solid #f0cf80;background:#fff7e8;border-radius:10px;font-size:12px;color:#7a5a12}
      .section{margin-bottom:14px}
      .section-title{font-size:11px;font-weight:700;letter-spacing:.4px;color:#8a8fa6;margin-bottom:4px}
      .section-body{font-size:14px;line-height:1.7;color:#1a1a2e;white-space:pre-wrap}
    </style></head><body><div class="wrap">
      <div class="header">
        <div class="label">BriefPilot — Antwort-Assistent</div>
        <h1 class="title">${escapeHtml(draft.betreff)}</h1>
        <div class="meta">
          <div><strong>Empfänger:</strong> ${escapeHtml(draft.empfaenger)}</div>
          ${azLine}
          ${stNrLine}
        </div>
      </div>
      <div class="disclaimer">Entwurf · Keine Rechtsberatung</div>
      <div class="section">
        <div class="section-title">Entwurf</div>
        <div class="section-body">${escapeHtml(editText).replace(/\n/g, '<br/>')}</div>
      </div>
    </div></body></html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const safeBase = (draft.betreff || 'Antwort-Entwurf')
      .replace(/[^\p{L}\p{N}\-_ ]/gu, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'Antwort-Entwurf';
    const target = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ''}${safeBase}.pdf`;
    if (target) {
      try {
        await FileSystem.copyAsync({ from: uri, to: target });
      } catch {
        // fall back to the temp file if copy fails
      }
    }
    const shareUri = target || uri;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(shareUri, { mimeType: 'application/pdf', dialogTitle: draft.betreff });
    }
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
              {T('reply.modal.title')}
            </Text>
            <Text style={{ fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              {T('reply.modal.notAvailable')}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={HIT_SLOP_LG}
              style={{ paddingVertical: 12, paddingHorizontal: 28, borderRadius: R.lg, backgroundColor: C.bgInput, borderWidth: 1, borderColor: C.border }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{T('reply.modal.close')}</Text>
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
                {T('reply.modal.howReply')}
              </Text>
            </View>

            {/* Analysis summary */}
            <View style={{ marginHorizontal: 16, marginBottom: 14, padding: 12, borderRadius: 10, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Icon name="identification-badge" size={14} color={C.textTertiary} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary }}>
                  {T('reply.modal.finanzamt.badge')}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 17 }}>
                {analysis.zusammenfassung}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {MODE_IDS.map(id => (
                <TouchableOpacity
                  key={id}
                  onPress={() => handleModeSelect(id)}
                  style={[st.modeCard, { backgroundColor: C.bgCard, borderColor: C.border }]}
                  activeOpacity={0.75}
                >
                  <View style={[st.modeIconWrap, { backgroundColor: C.primaryLight }]}>
                    <Icon name={MODE_ICONS[id]} size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{T(MODE_LABEL_KEY[id])}</Text>
                    <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 3, lineHeight: 16 }}>
                      {T(MODE_SUBTITLE_KEY[id])}
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
                <Text style={{ fontSize: 15, color: C.primary }}>{T('reply.modal.back')}</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.text }}>
                {T('reply.begruendet.label')}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              {/* Q1 */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 }}>
                {T('reply.q1.label')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[
                  { val: true, label: T('reply.q1.yes') },
                  { val: false, label: T('reply.q1.no') },
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
                {T('reply.q2.label')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[
                  { val: true, label: T('reply.q2.yes') },
                  { val: false, label: T('reply.q2.no') },
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
                {T('reply.q3.label')}
              </Text>
              <TextInput
                value={answers.zusatzinfo ?? ''}
                onChangeText={v => setAnswers(a => ({ ...a, zusatzinfo: v }))}
                placeholder={T('reply.q3.placeholder')}
                placeholderTextColor={C.textTertiary}
                style={[st.textInput, { backgroundColor: C.bgInput, borderColor: C.border, color: C.text }]}
                multiline
                numberOfLines={3}
              />

              {/* Recommendation if no evidence */}
              {answers.hasNachweis === false && (
                <View style={{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning }}>
                  <Text style={{ fontSize: 12, color: C.warningText, lineHeight: 17 }}>
                    {T('reply.noNachweis.warning')}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleQuestionsComplete}
                style={[st.primaryBtn, { backgroundColor: C.primary, marginTop: 24 }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{T('reply.createDraft')}</Text>
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
                <Text style={{ fontSize: 15, color: C.primary }}>{T('reply.modal.back')}</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: C.text }}>
                {mode ? T(MODE_LABEL_KEY[mode]) : T('reply.createDraft')}
              </Text>
            </View>

            {/* Meta: Empfänger + Betreff */}
            <View style={{ marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: C.bgInput, borderWidth: 0.5, borderColor: C.border }}>
              <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 2 }}>Empfänger</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6 }}>{draft.empfaenger}</Text>
              <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 2 }}>Betreff</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{draft.betreff}</Text>
              {(analysis?.aktenzeichen || analysis?.steuernummer) && (
                <>
                  <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 8, marginBottom: 2 }}>
                    Steuernummer / Aktenzeichen
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>
                    {[analysis?.steuernummer, analysis?.aktenzeichen].filter(Boolean).join(' · ')}
                  </Text>
                </>
              )}
            </View>

            <Disclaimer C={C} disclaimer={T('reply.disclaimer')} />

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
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.primaryDark }}>{T('reply.copy')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleSavePdf()}
                style={[st.secondaryBtn, { borderColor: C.border, backgroundColor: C.bgInput, flex: 1 }]}
              >
                <Icon name="file-pdf" size={16} color={C.text} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{T('reply.savePdf')}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
              <TouchableOpacity
                onPress={handleTeilen}
                style={[st.primaryBtn, { backgroundColor: C.primary }]}
              >
                <Icon name="share-network" size={16} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{T('reply.share')}</Text>
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
