import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { setPrivacyGateBypassed } from '@/hooks/privacyGateBypass';

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

const SENDER_KEYS = new Set(['name', 'adresse']);
/** Android clipboard overlay can briefly background the app; suppress privacy lock. */
const COPY_PRIVACY_BYPASS_MS = 2500;

function computeFillCannotRender(
  template: ReplyTemplate,
  values: Record<string, string>,
  senderValues: { name: string; adresse: string },
  empfaengerValues: { empfaenger_stelle: string },
): boolean {
  const requiredKeys = template.fields
    .filter(f => f.required && !SENDER_KEYS.has(f.key))
    .map(f => f.key);
  const templateMissing = requiredKeys.filter(k => !values[k]?.trim());
  const senderMissing = !senderValues.name.trim() || !senderValues.adresse.trim();
  const empfaengerMissing = !empfaengerValues.empfaenger_stelle.trim();
  return templateMissing.length > 0 || senderMissing || empfaengerMissing;
}

export default function ReplyAssistantPreview({
  category,
  institutionType,
  documentType,
  actionType,
  autoOpen = false,
  hideLauncher = false,
  onClose,
}: Props) {
  const { Colors: C, S, R } = useTheme();

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
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorDraft, setEditorDraft] = useState('');
  const autoOpenedRef = useRef(false);
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const copyBypassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyBypassHeldRef = useRef(false);

  const releaseCopyPrivacyBypass = useCallback(() => {
    if (copyBypassTimerRef.current) {
      clearTimeout(copyBypassTimerRef.current);
      copyBypassTimerRef.current = null;
    }
    if (copyBypassHeldRef.current) {
      copyBypassHeldRef.current = false;
      setPrivacyGateBypassed(false);
    }
  }, []);

  const holdCopyPrivacyBypass = useCallback((durationMs: number) => {
    releaseCopyPrivacyBypass();
    copyBypassHeldRef.current = true;
    setPrivacyGateBypassed(true);
    copyBypassTimerRef.current = setTimeout(releaseCopyPrivacyBypass, durationMs);
  }, [releaseCopyPrivacyBypass]);

  useEffect(() => () => releaseCopyPrivacyBypass(), [releaseCopyPrivacyBypass]);

  const todayDate = useMemo(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }, []);

  const { candidates } = getReplyTemplateCandidates({
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
        setSheetVisible(false);
        setDisclaimerVisible(true);
      }
    } catch {
      setSheetVisible(false);
      setDisclaimerVisible(true);
    }
  }, [openMainSheet]);

  const handleDisclaimerConfirm = useCallback(async () => {
    setDisclaimerVisible(false);
    try {
      await AsyncStorage.setItem(REPLY_ASSISTANT_DISCLAIMER_STORAGE_KEY, '1');
    } catch { /* non-blocking */ }
    openMainSheet();
  }, [openMainSheet]);

  const close = useCallback(() => {
    releaseCopyPrivacyBypass();
    Keyboard.dismiss();
    setDisclaimerVisible(false);
    setSheetVisible(false);
    onClose?.();
  }, [onClose, releaseCopyPrivacyBypass]);

  useEffect(() => {
    if (!autoOpen || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    void handleButtonPress();
  }, [autoOpen, handleButtonPress]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const selectTemplate = useCallback((t: ReplyTemplate) => {
    setSelectedTemplate(t);
    setFieldValues({});
    setRenderError(null);
    setStep('fill');
  }, []);

  const tryRender = useCallback(() => {
    if (!selectedTemplate) return;
    const mergedValues = { ...fieldValues, name: senderValues.name, adresse: senderValues.adresse };
    const result = renderReplyTemplate({ template: selectedTemplate, values: mergedValues });
    if (!result.ok) {
      setRenderError(
        result.blockedReason === 'missing_required'
          ? `Bitte füllen Sie alle Pflichtfelder aus: ${result.missingRequiredFields.map(getFieldLabel).join(', ')}.`
          : 'Der Entwurf konnte nicht erstellt werden. Bitte prüfen Sie Ihre Angaben.',
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
    Keyboard.dismiss();
    setStep('preview');
  }, [selectedTemplate, fieldValues, senderValues, empfaengerValues, todayDate]);

  const fillCannotRender = useMemo(() => {
    if (!selectedTemplate) return true;
    return computeFillCannotRender(selectedTemplate, fieldValues, senderValues, empfaengerValues);
  }, [selectedTemplate, fieldValues, senderValues, empfaengerValues]);

  const goToFillFromPreview = useCallback(() => {
    Keyboard.dismiss();
    setStep('fill');
  }, []);

  const openEditor = useCallback(() => {
    setEditorDraft(editedBody);
    setEditorVisible(true);
  }, [editedBody]);

  const saveEditor = useCallback(() => {
    setEditedBody(editorDraft);
    setEditorVisible(false);
  }, [editorDraft]);

  const restoreOriginal = useCallback(() => {
    setEditorDraft(renderedBody);
  }, [renderedBody]);

  const handleCopy = useCallback(async () => {
    if (editedBody.trim().length < 80) {
      Alert.alert(
        'Entwurf zu kurz',
        'Der Entwurf ist sehr kurz. Bitte prüfen Sie den Inhalt oder erstellen Sie den Entwurf erneut.',
      );
      return;
    }
    holdCopyPrivacyBypass(COPY_PRIVACY_BYPASS_MS);
    try {
      await ExpoClipboard.setStringAsync(`${renderedBriefkopf}Betreff: ${renderedSubject}\n\n${editedBody}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      releaseCopyPrivacyBypass();
    }
  }, [editedBody, renderedBriefkopf, renderedSubject, holdCopyPrivacyBypass, releaseCopyPrivacyBypass]);

  const sheetTitle =
    step === 'select' ? 'Antwortentwurf wählen' :
    step === 'fill'   ? 'Angaben ergänzen' :
                        'Entwurf prüfen';

  const fillCreateButton = (
    <TouchableOpacity
      onPress={tryRender}
      disabled={fillCannotRender}
      accessibilityRole="button"
      accessibilityLabel="Entwurf erstellen"
      style={{
        borderRadius: R.md,
        paddingVertical: 14,
        backgroundColor: fillCannotRender ? (C.border ?? '#ccc') : (C.primary ?? '#005FB8'),
        alignItems: 'center',
      }}
      activeOpacity={0.8}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
        Entwurf erstellen
      </Text>
    </TouchableOpacity>
  );

  const previewCopyButton = (
    <TouchableOpacity
      onPress={handleCopy}
      accessibilityRole="button"
      accessibilityLabel="Entwurf kopieren"
      style={{
        borderRadius: R.md,
        paddingVertical: 14,
        backgroundColor: copied ? (C.success ?? '#16A34A') : (C.primary ?? '#005FB8'),
        alignItems: 'center',
      }}
      activeOpacity={0.8}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
        {copied ? '✓ Kopiert — in E-Mail oder Schreiben einfügen' : 'Entwurf kopieren'}
      </Text>
    </TouchableOpacity>
  );

  const sheetFooter = step === 'fill'
    ? fillCreateButton
    : step === 'preview'
      ? (
        <View style={{ gap: 8 }}>
          {previewCopyButton}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={goToFillFromPreview}
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
      )
      : undefined;

  return (
    <>
      {!hideLauncher && (
        <TouchableOpacity
          onPress={handleButtonPress}
          style={[st.launcherButton, { borderColor: `${C.primary}55`, backgroundColor: C.primaryLight }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Antwortentwurf erstellen"
        >
          <Text style={[st.launcherButtonText, { color: C.primaryDark }]}>
            Antwortentwurf erstellen
          </Text>
        </TouchableOpacity>
      )}

      <AppSheet visible={sheetVisible} onClose={close} title={sheetTitle} footer={sheetFooter}>
        <Banner kind="global" text={REPLY_ASSISTANT_GLOBAL_BANNER} C={C} R={R} />

        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          // @ts-ignore — iOS 14+ native scroll adjustment when keyboard appears
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 12 }}
        >
          {step === 'select' && (
            <SelectStep
              candidates={candidates}
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
              error={renderError}
              C={C} S={S} R={R}
            />
          )}
          {step === 'preview' && (
            <PreviewStep
              template={selectedTemplate}
              briefkopf={renderedBriefkopf}
              subject={renderedSubject}
              editedBody={editedBody}
              onOpenEditor={openEditor}
              onEditFields={goToFillFromPreview}
              safetyNote={selectedTemplate?.safetyNote}
              C={C} S={S} R={R}
            />
          )}
        </ScrollView>
      </AppSheet>

      <Modal visible={editorVisible} animationType="slide" onRequestClose={saveEditor}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bgCard }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }}>
            <TouchableOpacity onPress={saveEditor} activeOpacity={0.75}>
              <Text style={{ color: C.primary, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>Entwurf bearbeiten</Text>
            <TouchableOpacity onPress={saveEditor} activeOpacity={0.75}>
              <Text style={{ color: C.primary, fontSize: 16, fontWeight: '600' }}>Fertig</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
            <TextInput
              value={editorDraft}
              onChangeText={setEditorDraft}
              multiline
              autoFocus
              style={{ padding: 16, fontSize: 15, lineHeight: 22, color: C.text, minHeight: 300 }}
            />
          </ScrollView>
          <TouchableOpacity
            onPress={restoreOriginal}
            style={{ paddingVertical: 14, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }}
            activeOpacity={0.75}
          >
            <Text style={{ color: C.primary, fontSize: 14 }}>Original wiederherstellen</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

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
  candidates, onSelect, C, R,
}: {
  candidates: ReplyTemplate[];
  onSelect: (t: ReplyTemplate) => void;
  C: any; S: any; R: any;
}) {
  if (candidates.length === 0) {
    return (
      <View style={{ padding: 12 }}>
        <Text style={{ color: C.textSecondary, fontSize: 13, lineHeight: 20 }}>
          Für dieses Dokument ist aktuell keine Antwortvorlage verfügbar.
        </Text>
      </View>
    );
  }
  return (
    <View style={{ paddingBottom: 8 }}>
      <Text style={{ color: C.textSecondary, fontSize: 13, marginBottom: 12, lineHeight: 19 }}>
        Wählen Sie eine passende Vorlage für Ihren Antwortentwurf.
      </Text>
      {candidates.map(t => (
        <TouchableOpacity
          key={t.id}
          onPress={() => onSelect(t)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t.title}
          style={{
            borderRadius: R.md,
            borderWidth: 0.6,
            borderColor: C.border,
            backgroundColor: C.bgCard,
            padding: 12,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{t.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Fill step ─────────────────────────────────────────────────────────────────

function FillStep({
  template, values, onChange,
  senderValues, onSenderChange,
  empfaengerValues, onEmpfaengerChange,
  error, C, R,
}: {
  template: ReplyTemplate;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
  senderValues: { name: string; adresse: string };
  onSenderChange: (field: 'name' | 'adresse', val: string) => void;
  empfaengerValues: { empfaenger_stelle: string; empfaenger_email: string; empfaenger_adresse: string };
  onEmpfaengerChange: (field: 'empfaenger_stelle' | 'empfaenger_email' | 'empfaenger_adresse', val: string) => void;
  error: string | null;
  C: any; S: any; R: any;
}) {
  const requiredKeys = template.fields.filter(f => f.required && !SENDER_KEYS.has(f.key)).map(f => f.key);
  const optionalKeys = template.fields.filter(f => !f.required && !SENDER_KEYS.has(f.key)).map(f => f.key);
  const highRisk = shouldShowHighRiskWarning(template);

  return (
    <View style={{ paddingBottom: 16 }}>
      {highRisk && (
        <Banner kind="highRisk" text={REPLY_ASSISTANT_HIGH_RISK_BANNER} C={C} R={R} />
      )}

      <SectionHeader label="IHRE ANGABEN" C={C} />
      <FieldInput fieldKey="name"    value={senderValues.name}    required onChange={v => onSenderChange('name', v)}    C={C} R={R} />
      <FieldInput fieldKey="adresse" value={senderValues.adresse} required onChange={v => onSenderChange('adresse', v)} C={C} R={R} />

      <SectionHeader label="EMPFÄNGER" C={C} top />
      <FieldInput fieldKey="empfaenger_stelle"  value={empfaengerValues.empfaenger_stelle}  required onChange={v => onEmpfaengerChange('empfaenger_stelle', v)}  C={C} R={R} />
      <FieldInput fieldKey="empfaenger_email"   value={empfaengerValues.empfaenger_email}   required={false} onChange={v => onEmpfaengerChange('empfaenger_email', v)}   C={C} R={R} />
      <FieldInput fieldKey="empfaenger_adresse" value={empfaengerValues.empfaenger_adresse} required={false} onChange={v => onEmpfaengerChange('empfaenger_adresse', v)} C={C} R={R} />

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
        blurOnSubmit={false}
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

function BriefkopfPreview({ briefkopf, C }: { briefkopf: string; C: any }) {
  const lines = briefkopf.trimEnd().split('\n');
  const absender = [lines[0], lines[1]].filter(Boolean);
  const empfaenger = [lines[3], lines[4]].filter(Boolean);
  const datum = lines[6];

  return (
    <View style={{ gap: 10 }}>
      <View>
        <Text style={{ color: C.textTertiary, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>Absender</Text>
        {absender.map((l, i) => (
          <Text key={`a-${i}`} style={{ color: C.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' }}>{l}</Text>
        ))}
      </View>
      <View>
        <Text style={{ color: C.textTertiary, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>Empfänger</Text>
        {empfaenger.map((l, i) => (
          <Text key={`e-${i}`} style={{ color: C.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' }}>{l}</Text>
        ))}
      </View>
      {datum ? (
        <View>
          <Text style={{ color: C.textTertiary, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>Datum</Text>
          <Text style={{ color: C.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' }}>{datum}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PreviewStep({
  template, briefkopf, subject, editedBody, onOpenEditor, onEditFields, safetyNote, C, R,
}: {
  template: ReplyTemplate | null;
  briefkopf: string;
  subject: string;
  editedBody: string;
  onOpenEditor: () => void;
  onEditFields: () => void;
  safetyNote?: string;
  C: any; S: any; R: any;
}) {
  const snippetLines = editedBody.split('\n').slice(0, 6);
  const snippet = snippetLines.join('\n');
  const isTruncated = editedBody.split('\n').length > 6;

  return (
    <View style={{ paddingBottom: 4 }}>
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
          <SectionHeader label="ABSENDER & EMPFÄNGER" C={C} />
          <View style={{
            borderRadius: R.sm ?? 6, borderWidth: 0.5, borderColor: C.border,
            backgroundColor: C.bgCard, padding: 10, marginBottom: 14,
          }}>
            <BriefkopfPreview briefkopf={briefkopf} C={C} />
            <TouchableOpacity
              onPress={onEditFields}
              style={{ marginTop: 8, alignItems: 'center', paddingVertical: 4 }}
              activeOpacity={0.75}
            >
              <Text style={{ color: C.primary, fontSize: 12, fontWeight: '600' }}>
                Absender & Empfänger bearbeiten
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <SectionHeader label="BETREFF" C={C} />
      <Text style={{
        color: C.text, fontSize: 13, fontWeight: '600',
        borderRadius: R.sm ?? 6, borderWidth: 0.5, borderColor: C.border,
        backgroundColor: C.bgCard, padding: 10, marginBottom: 14,
      }}>
        {subject}
      </Text>

      <SectionHeader label="INHALT" C={C} />
      <View style={{
        borderRadius: R.sm ?? 6, borderWidth: 0.8, borderColor: C.border,
        backgroundColor: C.bgCard, padding: 10,
      }}>
        <Text style={{ color: C.textSecondary, fontSize: 13, lineHeight: 20 }}>
          {snippet}
        </Text>
        {isTruncated && (
          <Text style={{ color: C.textTertiary, fontSize: 11, textAlign: 'center', marginTop: 4 }}>…</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={onOpenEditor}
        style={{ marginTop: 10, alignItems: 'center', paddingVertical: 6 }}
        activeOpacity={0.75}
      >
        <Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>
          Vollständig anzeigen & bearbeiten
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  launcherButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  launcherButtonText: {
    fontSize: 14,
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
