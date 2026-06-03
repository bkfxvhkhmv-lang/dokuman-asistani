import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import AppSheet from '@/design/components/AppSheet';
import { useTheme } from '@/ThemeContext';
import type { ReplyTemplate } from '@/features/reply-assistant/domain/types';
import { renderReplyTemplate } from '@/features/reply-assistant/domain/renderTemplate';
import { getReplyTemplateCandidates } from '@/features/reply-assistant/templates/matchCandidates';

if (!__DEV__) {
  throw new Error('ReplyAssistantDevPreview must only be used in __DEV__ builds');
}

interface Props {
  category?: string;
  institutionType?: string;
  documentType?: string;
  actionType?: string;
}

type Step = 'select' | 'fill' | 'preview';

export default function ReplyAssistantDevPreview({
  category,
  institutionType,
  documentType,
  actionType,
}: Props) {
  const { Colors: C, S, R } = useTheme();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [step, setStep] = useState<Step>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<ReplyTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [renderedSubject, setRenderedSubject] = useState('');
  const [renderedBody, setRenderedBody] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);

  const { candidates, reason } = getReplyTemplateCandidates({
    category, institutionType, documentType, actionType,
  });

  const open = useCallback(() => {
    setStep('select');
    setSelectedTemplate(null);
    setFieldValues({});
    setRenderedSubject('');
    setRenderedBody('');
    setRenderError(null);
    setSheetVisible(true);
  }, []);

  const close = useCallback(() => setSheetVisible(false), []);

  const selectTemplate = useCallback((t: ReplyTemplate) => {
    setSelectedTemplate(t);
    setFieldValues({});
    setRenderError(null);
    setStep('fill');
  }, []);

  const tryRender = useCallback(() => {
    if (!selectedTemplate) return;
    const result = renderReplyTemplate({ template: selectedTemplate, values: fieldValues });
    if (!result.ok) {
      setRenderError(
        result.blockedReason === 'missing_required'
          ? `Pflichtfelder fehlen: ${result.missingRequiredFields.join(', ')}`
          : `Render-Fehler: ${result.blockedReason}`,
      );
      return;
    }
    setRenderError(null);
    setRenderedSubject(result.subject ?? '');
    setRenderedBody(result.body ?? '');
    setStep('preview');
  }, [selectedTemplate, fieldValues]);

  const sheetTitle =
    step === 'select' ? `[DEV] Vorlagenkandidaten (${candidates.length})` :
    step === 'fill'   ? `[DEV] ${selectedTemplate?.title ?? ''}` :
                        '[DEV] Entwurfsvorschau';

  return (
    <>
      <TouchableOpacity
        onPress={open}
        style={[st.devButton, { borderColor: C.border, backgroundColor: `${C.primary}18` }]}
        activeOpacity={0.7}
      >
        <Text style={[st.devButtonText, { color: C.primary }]}>
          ⚙ Antwortentwurf erstellen
        </Text>
      </TouchableOpacity>

      <AppSheet visible={sheetVisible} onClose={close} title={sheetTitle}>
        <ScrollView
          style={{ maxHeight: 480 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
              onRender={tryRender}
              error={renderError}
              C={C} S={S} R={R}
            />
          )}
          {step === 'preview' && (
            <PreviewStep
              subject={renderedSubject}
              body={renderedBody}
              safetyNote={selectedTemplate?.safetyNote}
              onEdit={() => setStep('fill')}
              onClose={close}
              C={C} S={S} R={R}
            />
          )}
        </ScrollView>
      </AppSheet>
    </>
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
            borderColor: C.border,
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

// ── Fill step ─────────────────────────────────────────────────────────────────

function FillStep({
  template, values, onChange, onRender, error, C, R,
}: {
  template: ReplyTemplate;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
  onRender: () => void;
  error: string | null;
  C: any; S: any; R: any;
}) {
  const requiredKeys = template.fields.filter(f => f.required).map(f => f.key);
  const optionalKeys = template.fields.filter(f => !f.required).map(f => f.key);
  const allMissing = requiredKeys.filter(k => !values[k]?.trim());

  return (
    <View style={{ paddingBottom: 16 }}>
      {requiredKeys.length > 0 && (
        <>
          <Text style={{ color: C.textTertiary, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
            PFLICHTFELDER
          </Text>
          {requiredKeys.map(key => (
            <FieldInput
              key={key}
              fieldKey={key}
              value={values[key] ?? ''}
              required
              onChange={val => onChange(key, val)}
              C={C} R={R}
            />
          ))}
        </>
      )}
      {optionalKeys.length > 0 && (
        <>
          <Text style={{ color: C.textTertiary, fontSize: 11, fontWeight: '700', marginTop: 14, marginBottom: 6 }}>
            OPTIONALE FELDER
          </Text>
          {optionalKeys.map(key => (
            <FieldInput
              key={key}
              fieldKey={key}
              value={values[key] ?? ''}
              required={false}
              onChange={val => onChange(key, val)}
              C={C} R={R}
            />
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
        disabled={allMissing.length > 0}
        style={{
          marginTop: 16,
          borderRadius: R.md,
          paddingVertical: 13,
          paddingHorizontal: 16,
          backgroundColor: allMissing.length > 0 ? (C.border ?? '#ccc') : (C.primary ?? '#005FB8'),
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
        {fieldKey}{required ? ' *' : ''}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={fieldKey}
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
  subject, body, safetyNote, onEdit, onClose, C, R,
}: {
  subject: string;
  body: string;
  safetyNote?: string;
  onEdit: () => void;
  onClose: () => void;
  C: any; S: any; R: any;
}) {
  const [editableBody, setEditableBody] = useState(body);

  return (
    <View style={{ paddingBottom: 16 }}>
      {!!safetyNote && (
        <View style={{
          borderRadius: R.md,
          backgroundColor: `${C.warning ?? '#F59E0B'}18`,
          borderWidth: 0.8,
          borderColor: `${C.warning ?? '#F59E0B'}55`,
          padding: 10,
          marginBottom: 14,
        }}>
          <Text style={{ color: C.text, fontSize: 12 }}>
            ⚠ {safetyNote}
          </Text>
        </View>
      )}

      <Text style={{ color: C.textTertiary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
        BETREFF
      </Text>
      <Text style={{
        color: C.text, fontSize: 13, fontWeight: '600',
        borderRadius: R.sm, borderWidth: 0.5, borderColor: C.border,
        backgroundColor: C.bgCard, padding: 10, marginBottom: 14,
      }}>
        {subject}
      </Text>

      <Text style={{ color: C.textTertiary, fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
        INHALT — Entwurf bearbeiten
      </Text>
      <TextInput
        value={editableBody}
        onChangeText={setEditableBody}
        multiline
        style={{
          borderRadius: R.sm,
          borderWidth: 0.8,
          borderColor: C.border,
          backgroundColor: C.bgCard,
          color: C.text,
          fontSize: 13,
          lineHeight: 20,
          padding: 10,
          minHeight: 160,
          textAlignVertical: 'top',
        }}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <TouchableOpacity
          onPress={onEdit}
          style={{
            flex: 1, borderRadius: R.md, paddingVertical: 12,
            borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard,
            alignItems: 'center',
          }}
          activeOpacity={0.75}
        >
          <Text style={{ color: C.textSecondary, fontWeight: '700', fontSize: 14 }}>
            Felder bearbeiten
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClose}
          style={{
            flex: 1, borderRadius: R.md, paddingVertical: 12,
            borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard,
            alignItems: 'center',
          }}
          activeOpacity={0.75}
        >
          <Text style={{ color: C.textSecondary, fontWeight: '700', fontSize: 14 }}>
            Schließen
          </Text>
        </TouchableOpacity>
      </View>
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
});
