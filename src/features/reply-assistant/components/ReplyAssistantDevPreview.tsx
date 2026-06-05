import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  useWindowDimensions,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppSheet from '@/design/components/AppSheet';
import { useTheme } from '@/ThemeContext';
import type { ReplyTemplate } from '@/features/reply-assistant/domain/types';
import { renderReplyTemplate } from '@/features/reply-assistant/domain/renderTemplate';
import {
  REPLY_ASSISTANT_DISCLAIMER_STORAGE_KEY,
  REPLY_ASSISTANT_GLOBAL_BANNER,
  REPLY_ASSISTANT_HIGH_RISK_BANNER,
  shouldShowHighRiskWarning,
} from '@/features/reply-assistant/domain/safety';
import { getFieldLabel } from '@/features/reply-assistant/domain/fieldLabels';
import { renderBriefkopf } from '@/features/reply-assistant/domain/renderBriefkopf';
import { getReplyTemplateCandidates } from '@/features/reply-assistant/templates/matchCandidates';

if (!__DEV__) {
  throw new Error('ReplyAssistantDevPreview must only be used in __DEV__ builds');
}

interface Props {
  category?: string;
  institutionType?: string;
  documentType?: string;
  actionType?: string;
  autoOpen?: boolean;
  hideLauncher?: boolean;
  onClose?: () => void;
}

type Step = 'select' | 'fill' | 'preview';

export default function ReplyAssistantDevPreview({
  category,
  institutionType,
  documentType,
  actionType,
  autoOpen = false,
  hideLauncher = false,
  onClose,
}: Props) {
  const { Colors: C, S, R } = useTheme();
  const { height: screenH } = useWindowDimensions();
  // AppSheet = 88% screenH. Reserve handle(44) + header(80) + banner(52) + paddingBottom(40) + footer(150)
  const scrollMaxH = Math.max(200, Math.round(screenH * 0.88) - 366);

  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [step, setStep] = useState<Step>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<ReplyTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [senderValues, setSenderValues] = useState({ name: '', adresse: '' });
  const [empfaengerValues, setEmpfaengerValues] = useState({
    empfaenger_stelle: '', empfaenger_email: '', empfaenger_adresse: '',
  });
  const [renderedBriefkopf, setRenderedBriefkopf] = useState('');
  const [renderedSubject, setRenderedSubject] = useState('');
  const [renderedBody, setRenderedBody] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const autoOpenedRef = useRef(false);

  const todayDate = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }, []);

  const { candidates, reason } = getReplyTemplateCandidates({
    category, institutionType, documentType, actionType,
  });

  const openMainSheet = useCallback(() => {
    setStep('select');
    setSelectedTemplate(null);
    setFieldValues({});
    setSenderValues({ name: '', adresse: '' });
    setEmpfaengerValues({ empfaenger_stelle: '', empfaenger_email: '', empfaenger_adresse: '' });
    setRenderedBriefkopf('');
    setRenderedSubject('');
    setRenderedBody('');
    setRenderError(null);
    setSheetVisible(true);
  }, []);

  const handleButtonPress = useCallback(async () => {
    try {
      const seen = await AsyncStorage.getItem(REPLY_ASSISTANT_DISCLAIMER_STORAGE_KEY);
      if (seen === '1') {
        openMainSheet();
      } else {
        openMainSheet();
        setDisclaimerVisible(true);
      }
    } catch {
      openMainSheet();
      setDisclaimerVisible(true);
    }
  }, [openMainSheet]);

  const handleDisclaimerConfirm = useCallback(async () => {
    setDisclaimerVisible(false);
    try {
      await AsyncStorage.setItem(REPLY_ASSISTANT_DISCLAIMER_STORAGE_KEY, '1');
    } catch { /* non-blocking */ }
  }, []);

  const close = useCallback(() => {
    setDisclaimerVisible(false);
    setSheetVisible(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!autoOpen || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    void handleButtonPress();
  }, [autoOpen, handleButtonPress]);

  const selectTemplate = useCallback((t: ReplyTemplate) => {
    setSelectedTemplate(t);
    setFieldValues({});
    setRenderError(null);
    setStep('fill');
  }, []);

  const tryRender = useCallback(() => {
    if (!selectedTemplate) return;
    // Merge sender identity so {{name}}/{{adresse}} in template body still substitute correctly.
    const mergedValues = { ...fieldValues, name: senderValues.name, adresse: senderValues.adresse };
    const result = renderReplyTemplate({ template: selectedTemplate, values: mergedValues });
    if (!result.ok) {
      setRenderError(
        result.blockedReason === 'missing_required'
          ? `Pflichtfelder fehlen: ${result.missingRequiredFields.join(', ')}`
          : `Render-Fehler: ${result.blockedReason}`,
      );
      return;
    }
    setRenderError(null);
    setRenderedBriefkopf(renderBriefkopf({
      senderName: senderValues.name,
      senderAdresse: senderValues.adresse,
      empfaengerStelle: empfaengerValues.empfaenger_stelle,
      empfaengerAdresse: empfaengerValues.empfaenger_adresse || undefined,
      datum: todayDate,
    }));
    setRenderedSubject(result.subject ?? '');
    setRenderedBody(result.body ?? '');
    setEditedBody(result.body ?? '');
    setStep('preview');
  }, [selectedTemplate, fieldValues, senderValues, empfaengerValues, todayDate]);

  const handleCopy = useCallback(() => {
    ExpoClipboard.setStringAsync(`${renderedBriefkopf}Betreff: ${renderedSubject}\n\n${editedBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [renderedBriefkopf, renderedSubject, editedBody]);

  const sheetTitle =
    step === 'select' ? `[DEV] Vorlagenkandidaten (${candidates.length})` :
    step === 'fill'   ? `[DEV] ${selectedTemplate?.title ?? ''}` :
                        '[DEV] Entwurfsvorschau';

  const previewFooter = step === 'preview' ? (
    <View style={{ gap: 8 }}>
      <TouchableOpacity
        onPress={handleCopy}
        style={{
          borderRadius: R.md, paddingVertical: 14,
          backgroundColor: copied ? (C.success ?? '#16A34A') : (C.primary ?? '#005FB8'),
          alignItems: 'center',
        }}
        activeOpacity={0.8}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
          {copied ? '✓ Kopiert — in E-Mail oder Schreiben einfügen' : 'Entwurf kopieren'}
        </Text>
      </TouchableOpacity>
      <Text style={{ color: C.textTertiary, fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
        BriefPilot erstellt nur den Text.{'\n'}
        Sie prüfen, ergänzen und versenden ihn selbst.
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={() => setStep('fill')}
          style={{ flex: 1, borderRadius: R.md, paddingVertical: 11, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard, alignItems: 'center' }}
          activeOpacity={0.75}
        >
          <Text style={{ color: C.textSecondary, fontWeight: '600', fontSize: 13 }}>Felder bearbeiten</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={close}
          style={{ flex: 1, borderRadius: R.md, paddingVertical: 11, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard, alignItems: 'center' }}
          activeOpacity={0.75}
        >
          <Text style={{ color: C.textSecondary, fontWeight: '600', fontSize: 13 }}>Schließen</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : undefined;

  return (
    <>
      {!hideLauncher && (
        <TouchableOpacity
          onPress={handleButtonPress}
          style={[st.devButton, { borderColor: C.border, backgroundColor: `${C.primary}18` }]}
          activeOpacity={0.7}
        >
          <Text style={[st.devButtonText, { color: C.primary }]}>
            ⚙ Antwortentwurf erstellen
          </Text>
        </TouchableOpacity>
      )}

      <AppSheet visible={sheetVisible} onClose={close} title={sheetTitle} footer={previewFooter}>
        <Banner kind="global" text={REPLY_ASSISTANT_GLOBAL_BANNER} C={C} R={R} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // @ts-ignore — iOS 14+ native scroll adjustment when keyboard appears
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: scrollMaxH }}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {step === 'select' && (
            <SelectStep
              candidates={candidates}
              reason={reason}
              onSelect={selectTemplate}
              C={C} S={S} R={R}
            />
          )}
          {step === 'fill' && selectedTemplate && (
            <FillStep
              template={selectedTemplate}
              values={fieldValues}
              onChange={(key, val) => setFieldValues(prev => ({ ...prev, [key]: val }))}
              senderValues={senderValues}
              onSenderChange={(field, val) => setSenderValues(prev => ({ ...prev, [field]: val }))}
              empfaengerValues={empfaengerValues}
              onEmpfaengerChange={(field, val) => setEmpfaengerValues(prev => ({ ...prev, [field]: val }))}
              onRender={tryRender}
              error={renderError}
              C={C} S={S} R={R}
            />
          )}
          {step === 'preview' && (
            <PreviewStep
              template={selectedTemplate}
              briefkopf={renderedBriefkopf}
              subject={renderedSubject}
              body={renderedBody}
              editedBody={editedBody}
              onEditedBodyChange={setEditedBody}
              safetyNote={selectedTemplate?.safetyNote}
              C={C} S={S} R={R}
            />
          )}
        </ScrollView>
      </AppSheet>

      <Modal transparent visible={disclaimerVisible} animationType="fade" onRequestClose={() => {}}>
        <View style={st.disclaimerBackdrop}>
          <View style={[
            st.disclaimerCard,
            { backgroundColor: C.bgCard, borderColor: C.border, shadowColor: '#000' },
          ]}>
            <Text style={[st.disclaimerTitle, { color: C.text }]}>⚠ Wichtiger Hinweis</Text>
            <Text style={[st.disclaimerBody, { color: C.textSecondary }]}>
              BriefPilot erstellt nur Textvorlagen.{'\n'}
              Diese sind kein Rechtsrat und keine Rechtsberatung.{'\n\n'}
              Bei Fristen, Behörden, Jobcenter, Finanzamt oder Gerichtsschreiben kann ein Fehler ernste Folgen haben.{'\n\n'}
              Ich verstehe, dass ich alle Texte selbst prüfen und bei Bedarf anpassen muss.
            </Text>
            <TouchableOpacity
              onPress={handleDisclaimerConfirm}
              style={[st.disclaimerButton, { backgroundColor: C.primary ?? '#005FB8' }]}
              activeOpacity={0.82}
            >
              <Text style={st.disclaimerButtonLabel}>Verstanden</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Banner({
  kind,
  text,
  C,
  R,
}: {
  kind: 'global' | 'highRisk';
  text: string;
  C: any;
  R: any;
}) {
  const isHighRisk = kind === 'highRisk';

  return (
    <View style={[st.banner, {
      borderRadius: R.md,
      backgroundColor: isHighRisk ? `${C.warning ?? '#F59E0B'}18` : `${C.primary}12`,
      borderColor: isHighRisk ? `${C.warning ?? '#F59E0B'}55` : `${C.primary}33`,
    }]}>
      <Text style={{ color: C.text, fontSize: 12, fontWeight: isHighRisk ? '600' : '500' }}>
        {text}
      </Text>
    </View>
  );
}

// ── Select step ───────────────────────────────────────────────────────────────

function SelectStep({
  candidates, reason, onSelect, C, R,
}: {
  candidates: ReplyTemplate[];
  reason: string;
  onSelect: (t: ReplyTemplate) => void;
  C: any; S: any; R: any;
}) {
  if (candidates.length === 0) {
    return (
      <Text style={{ color: C.textSecondary, fontSize: 13, padding: 12 }}>
        Keine Kandidaten für dieses Dokument. (reason: {reason})
      </Text>
    );
  }
  return (
    <View style={{ paddingBottom: 16 }}>
      <Text style={{ color: C.textTertiary, fontSize: 11, marginBottom: 10 }}>
        match: {reason}
      </Text>
      {candidates.map(t => (
        <TouchableOpacity
          key={t.id}
          onPress={() => onSelect(t)}
          activeOpacity={0.75}
          style={{
            borderRadius: R.md,
            borderWidth: 0.6,
            borderColor: t.safety.riskLevel === 'high' ? `${C.warning ?? '#F59E0B'}88` : C.border,
            backgroundColor: C.bgCard,
            padding: 12,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{t.title}</Text>
          <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: 3 }}>
            {t.id} · risk: {t.safety.riskLevel}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Keys sourced from senderValues — excluded from template field rendering to avoid duplication.
const SENDER_KEYS = new Set(['name', 'adresse']);

// ── Fill step ─────────────────────────────────────────────────────────────────

function FillStep({
  template, values, onChange,
  senderValues, onSenderChange,
  empfaengerValues, onEmpfaengerChange,
  onRender, error, C, R,
}: {
  template: ReplyTemplate;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
  senderValues: { name: string; adresse: string };
  onSenderChange: (field: 'name' | 'adresse', val: string) => void;
  empfaengerValues: { empfaenger_stelle: string; empfaenger_email: string; empfaenger_adresse: string };
  onEmpfaengerChange: (field: 'empfaenger_stelle' | 'empfaenger_email' | 'empfaenger_adresse', val: string) => void;
  onRender: () => void;
  error: string | null;
  C: any; S: any; R: any;
}) {
  // Filter out name/adresse — they're collected in IHRE ANGABEN to avoid duplicate inputs.
  const requiredKeys = template.fields.filter(f => f.required && !SENDER_KEYS.has(f.key)).map(f => f.key);
  const optionalKeys = template.fields.filter(f => !f.required && !SENDER_KEYS.has(f.key)).map(f => f.key);

  const templateMissing = requiredKeys.filter(k => !values[k]?.trim());
  const senderMissing = !senderValues.name.trim() || !senderValues.adresse.trim();
  const empfaengerMissing = !empfaengerValues.empfaenger_stelle.trim();
  const cannotRender = templateMissing.length > 0 || senderMissing || empfaengerMissing;

  const highRisk = shouldShowHighRiskWarning(template);

  return (
    <View style={{ paddingBottom: 16 }}>
      {highRisk && (
        <Banner kind="highRisk" text={REPLY_ASSISTANT_HIGH_RISK_BANNER} C={C} R={R} />
      )}

      {/* ── IHRE ANGABEN ────────────────────────────────────── */}
      <SectionHeader label="IHRE ANGABEN" C={C} />
      <FieldInput fieldKey="name"    value={senderValues.name}    required onChange={v => onSenderChange('name', v)}    C={C} R={R} />
      <FieldInput fieldKey="adresse" value={senderValues.adresse} required onChange={v => onSenderChange('adresse', v)} C={C} R={R} />

      {/* ── EMPFÄNGER ───────────────────────────────────────── */}
      <SectionHeader label="EMPFÄNGER" C={C} top />
      <FieldInput fieldKey="empfaenger_stelle"  value={empfaengerValues.empfaenger_stelle}  required onChange={v => onEmpfaengerChange('empfaenger_stelle', v)}  C={C} R={R} />
      <FieldInput fieldKey="empfaenger_email"   value={empfaengerValues.empfaenger_email}   required={false} onChange={v => onEmpfaengerChange('empfaenger_email', v)}   C={C} R={R} />
      <FieldInput fieldKey="empfaenger_adresse" value={empfaengerValues.empfaenger_adresse} required={false} onChange={v => onEmpfaengerChange('empfaenger_adresse', v)} C={C} R={R} />

      {/* ── VORGANG (template-specific) ─────────────────────── */}
      {(requiredKeys.length > 0 || optionalKeys.length > 0) && (
        <SectionHeader label="VORGANG" C={C} top />
      )}
      {requiredKeys.map(key => (
        <FieldInput key={key} fieldKey={key} value={values[key] ?? ''} required onChange={val => onChange(key, val)} C={C} R={R} />
      ))}
      {optionalKeys.length > 0 && (
        <>
          <Text style={{ color: C.textTertiary, fontSize: 10, fontWeight: '600', marginTop: 10, marginBottom: 4 }}>
            OPTIONAL
          </Text>
          {optionalKeys.map(key => (
            <FieldInput key={key} fieldKey={key} value={values[key] ?? ''} required={false} onChange={val => onChange(key, val)} C={C} R={R} />
          ))}
        </>
      )}

      {!!error && (
        <Text style={{ color: C.danger ?? '#d00', fontSize: 12, marginTop: 10 }}>
          {error}
        </Text>
      )}
      <TouchableOpacity
        onPress={onRender}
        disabled={cannotRender}
        style={{
          marginTop: 16,
          borderRadius: R.md,
          paddingVertical: 13,
          paddingHorizontal: 16,
          backgroundColor: cannotRender ? (C.border ?? '#ccc') : (C.primary ?? '#005FB8'),
          alignItems: 'center',
        }}
        activeOpacity={0.8}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
          Entwurf erstellen
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SectionHeader({ label, C, top = false }: { label: string; C: any; top?: boolean }) {
  return (
    <Text style={{ color: C.textTertiary, fontSize: 11, fontWeight: '700', marginTop: top ? 14 : 0, marginBottom: 6 }}>
      {label}
    </Text>
  );
}

function FieldInput({
  fieldKey, value, required, onChange, C, R,
}: {
  fieldKey: string;
  value: string;
  required: boolean;
  onChange: (val: string) => void;
  C: any; R: any;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: C.textSecondary, fontSize: 12, marginBottom: 4 }}>
        {getFieldLabel(fieldKey)}{required ? ' *' : ''}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={getFieldLabel(fieldKey)}
        placeholderTextColor={C.textTertiary}
        style={{
          borderRadius: R.sm,
          borderWidth: 1,
          borderColor: value.trim() ? C.primary : C.border,
          backgroundColor: C.bgCard,
          color: C.text,
          fontSize: 13,
          paddingHorizontal: 10,
          paddingVertical: 9,
        }}
      />
    </View>
  );
}

// ── Preview step ──────────────────────────────────────────────────────────────

function PreviewStep({
  template, briefkopf, subject, body, editedBody, onEditedBodyChange, safetyNote, C, R,
}: {
  template: ReplyTemplate | null;
  briefkopf: string;
  subject: string;
  body: string;
  editedBody: string;
  onEditedBodyChange: (v: string) => void;
  safetyNote?: string;
  C: any; S: any; R: any;
}) {
  return (
    <View style={{ paddingBottom: 8 }}>
      {shouldShowHighRiskWarning(template) && (
        <Banner kind="highRisk" text={REPLY_ASSISTANT_HIGH_RISK_BANNER} C={C} R={R} />
      )}
      {!!safetyNote && (
        <View style={{
          borderRadius: R.md ?? 10,
          backgroundColor: `${C.warning ?? '#F59E0B'}18`,
          borderWidth: 0.8,
          borderColor: `${C.warning ?? '#F59E0B'}55`,
          padding: 10,
          marginBottom: 14,
        }}>
          <Text style={{ color: C.text, fontSize: 12 }}>⚠ {safetyNote}</Text>
        </View>
      )}

      {!!briefkopf && (
        <>
          <Text style={{ color: C.textTertiary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
            ABSENDER & EMPFÄNGER
          </Text>
          <Text style={{
            color: C.textSecondary, fontSize: 12, lineHeight: 18,
            borderRadius: R.sm ?? 6, borderWidth: 0.5, borderColor: C.border,
            backgroundColor: C.bgCard, padding: 10, marginBottom: 14,
            fontFamily: 'monospace',
          }}>
            {briefkopf.trimEnd()}
          </Text>
        </>
      )}

      <Text style={{ color: C.textTertiary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
        BETREFF
      </Text>
      <Text style={{
        color: C.text, fontSize: 13, fontWeight: '600',
        borderRadius: R.sm ?? 6, borderWidth: 0.5, borderColor: C.border,
        backgroundColor: C.bgCard, padding: 10, marginBottom: 14,
      }}>
        {subject}
      </Text>

      <Text style={{ color: C.textTertiary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
        INHALT — Entwurf bearbeiten
      </Text>
      <TextInput
        value={editedBody}
        onChangeText={onEditedBodyChange}
        multiline
        style={{
          borderRadius: R.sm ?? 6,
          borderWidth: 0.8,
          borderColor: C.border,
          backgroundColor: C.bgCard,
          color: C.text,
          fontSize: 13,
          lineHeight: 20,
          padding: 10,
          minHeight: 200,
          textAlignVertical: 'top',
        }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  devButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  devButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  banner: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  disclaimerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  disclaimerCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  disclaimerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  disclaimerBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  disclaimerButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  disclaimerButtonLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
