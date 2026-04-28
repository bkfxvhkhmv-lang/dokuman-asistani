import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useTheme, type ThemeColors } from '../ThemeContext';
import type { RadiusTokens } from '../theme';
import type { AutoFillResult, AutoFillField, ExtractedFields, FieldConfidence } from '../services/SmartAutoFillService';
import type { CategoryResult } from '../services/SmartCategorizationService';

interface AutoFillReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onBestaetigen: (edits: Partial<ExtractedFields>) => void;
  autoFillResult: AutoFillResult | null;
  categoryResult: CategoryResult | null;
  isProcessing?: boolean;
}

const CONFIDENCE_COLORS = {
  hoch:    { bg: '#EAF3DE', border: '#5DCAA5', text: '#1D6641', dot: '#1D9E75' },
  mittel:  { bg: '#FAEEDA', border: '#EF9F27', text: '#633806', dot: '#BA7517' },
  niedrig: { bg: '#FCEBEB', border: '#F09595', text: '#A32D2D', dot: '#E24B4A' },
  fehlt:   { bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280', dot: '#9CA3AF' },
};

const CONFIDENCE_LABEL: Record<FieldConfidence, string> = {
  hoch:    'Sicher',
  mittel:  'Wahrscheinlich',
  niedrig: 'Unsicher',
  fehlt:   'Nicht erkannt',
};

function ConfidencePill({ confidence, score }: { confidence: FieldConfidence; score: number }) {
  const c = CONFIDENCE_COLORS[confidence];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 1, borderColor: c.border }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.dot }} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: c.text }}>
        {CONFIDENCE_LABEL[confidence]} {score > 0 ? `${score}%` : ''}
      </Text>
    </View>
  );
}

function FieldRow({
  field,
  onEdit,
  editValue,
  isEditing,
  onStartEdit,
  onEndEdit,
  C, R,
}: {
  field: AutoFillField;
  onEdit: (key: keyof ExtractedFields, val: string) => void;
  editValue: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  C: ThemeColors; R: RadiusTokens;
}) {
  const wertStr = field.wert === null ? '' : String(field.wert);
  const isEmpty = field.wert === null || wertStr === '';
  const conf = isEmpty ? 'fehlt' : field.confidence;

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Text style={{ fontSize: 13 }}>{field.icon}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, flex: 1 }}>{field.label}</Text>
        <ConfidencePill confidence={conf} score={field.confidenceScore} />
        {field.erforderlich && isEmpty && (
          <View style={{ backgroundColor: '#FCEBEB', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#E24B4A' }}>PFLICHT</Text>
          </View>
        )}
      </View>
      {field.editierbar ? (
        isEditing ? (
          <TextInput
            value={editValue}
            onChangeText={v => onEdit(field.key, v)}
            onBlur={onEndEdit}
            autoFocus
            style={{ backgroundColor: C.bgInput, borderRadius: R.md, padding: 10,
              fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.primary }}
          />
        ) : (
          <TouchableOpacity
            onPress={onStartEdit}
            style={{ backgroundColor: isEmpty ? C.bgInput + '80' : C.bgInput, borderRadius: R.md, padding: 10,
              borderWidth: 1, borderColor: isEmpty ? C.dangerBorder : C.border,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: isEmpty ? C.textTertiary : C.text, flex: 1 }}>
              {isEmpty ? `${field.label} eingeben…` : wertStr}
            </Text>
            <Text style={{ fontSize: 11, color: C.primary }}>✏️</Text>
          </TouchableOpacity>
        )
      ) : (
        <View style={{ backgroundColor: C.bgInput, borderRadius: R.md, padding: 10, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 14, color: C.text }}>{wertStr || '–'}</Text>
        </View>
      )}
    </View>
  );
}

function CategoryBadge({ result, C, R, onAlt }: { result: CategoryResult; C: ThemeColors; R: RadiusTokens; onAlt: (typ: string) => void }) {
  const [showAlts, setShowAlts] = useState(false);
  return (
    <View style={{ backgroundColor: C.primaryLight, borderRadius: R.lg, padding: 14, marginBottom: 16,
      borderWidth: 1, borderColor: C.primary + '44' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.primaryDark, marginBottom: 2 }}>
            KI-ERKENNUNG
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: C.text }}>
            {result.institution?.icon ? `${result.institution.icon} ` : ''}{result.typ}
            {result.subtyp ? ` · ${result.subtyp}` : ''}
          </Text>
          {result.institution && (
            <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
              {result.institution.name}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={{ backgroundColor: result.confidence >= 80 ? '#EAF3DE' : result.confidence >= 55 ? '#FAEEDA' : '#FCEBEB',
            borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '800',
              color: result.confidence >= 80 ? '#1D9E75' : result.confidence >= 55 ? '#BA7517' : '#E24B4A' }}>
              {result.confidence}%
            </Text>
          </View>
          {result.alternatives.length > 0 && (
            <TouchableOpacity onPress={() => setShowAlts(v => !v)}>
              <Text style={{ fontSize: 11, color: C.primary }}>{showAlts ? 'Ausblenden' : 'Alternativen ▾'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {result.hatirlatma && (
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11 }}>💡</Text>
          <Text style={{ fontSize: 12, color: C.primaryDark }}>{result.hatirlatma}</Text>
        </View>
      )}

      {showAlts && result.alternatives.map((alt, i) => (
        <TouchableOpacity key={i} onPress={() => { onAlt(alt.typ); setShowAlts(false); }}
          style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between',
            backgroundColor: C.bgCard, borderRadius: R.md, padding: 10,
            borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 13, color: C.text }}>{alt.typ}{alt.subtyp ? ` · ${alt.subtyp}` : ''}</Text>
          <Text style={{ fontSize: 12, color: C.textTertiary }}>{alt.score}% →</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AutoFillReviewModal({
  visible, onClose, onBestaetigen,
  autoFillResult, categoryResult, isProcessing = false,
}: AutoFillReviewModalProps) {
  const { Colors: C, R } = useTheme();
  const [edits, setEdits] = useState<Partial<ExtractedFields>>({});
  const [editingKey, setEditingKey] = useState<keyof ExtractedFields | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (key: keyof ExtractedFields, val: string) => {
    setEdits(prev => ({ ...prev, [key]: val }));
  };

  const handleStartEdit = (field: AutoFillField) => {
    const current = edits[field.key] !== undefined
      ? String(edits[field.key])
      : field.wert !== null ? String(field.wert) : '';
    setEditingKey(field.key);
    setEditValue(current);
  };

  const handleEndEdit = () => {
    if (editingKey) handleEdit(editingKey, editValue);
    setEditingKey(null);
  };

  const handleCategoryAlt = (typ: string) => {
    setEdits(prev => ({ ...prev, typ }));
  };

  const handleBestaetigen = () => {
    onBestaetigen(edits);
    setEdits({});
    setEditingKey(null);
  };

  const missing = useMemo(() => {
    if (!autoFillResult) return [];
    return autoFillResult.fehlendePflichtfelder.filter(label => {
      const field = autoFillResult.fields.find(f => f.label === label);
      if (!field) return true;
      const editVal = edits[field.key];
      return editVal === undefined || editVal === null || String(editVal).trim() === '';
    });
  }, [autoFillResult, edits]);

  const overallConf = autoFillResult?.gesamtConfidence ?? 0;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          maxHeight: '92%', paddingBottom: 24 }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
            alignSelf: 'center', marginTop: 12, marginBottom: 12 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
                🤖 KI-Erkennung prüfen
              </Text>
              <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                Alles stimmt? Tippe auf ein Feld zum Bearbeiten.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.bgInput,
                alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, color: C.textSecondary }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Overall confidence bar */}
          {autoFillResult && (
            <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: C.textTertiary }}>Erkennungs-Genauigkeit</Text>
                <Text style={{ fontSize: 11, fontWeight: '700',
                  color: overallConf >= 75 ? '#1D9E75' : overallConf >= 50 ? '#BA7517' : '#E24B4A' }}>
                  {overallConf}%
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 6, borderRadius: 3,
                  width: `${overallConf}%`,
                  backgroundColor: overallConf >= 75 ? '#1D9E75' : overallConf >= 50 ? '#BA7517' : '#E24B4A' }} />
              </View>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled">

            {isProcessing ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 16 }}>
                  KI analysiert Dokument…
                </Text>
              </View>
            ) : (
              <>
                {/* Category Result */}
                {categoryResult && (
                  <CategoryBadge result={categoryResult} C={C} R={R} onAlt={handleCategoryAlt} />
                )}

                {/* Correction hints */}
                {(autoFillResult?.korrekturVorschlaege ?? []).length > 0 && (
                  <View style={{ backgroundColor: '#FAEEDA', borderRadius: R.lg, padding: 12,
                    marginBottom: 14, borderWidth: 1, borderColor: '#EF9F27' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#633806', marginBottom: 6 }}>
                      ⚠️ Bitte prüfen
                    </Text>
                    {(autoFillResult?.korrekturVorschlaege ?? []).map((k, i) => (
                      <Text key={i} style={{ fontSize: 12, color: '#633806', marginTop: 2 }}>
                        • {k.grund}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Fields */}
                {(autoFillResult?.fields ?? []).map(field => (
                  <FieldRow
                    key={field.key}
                    field={field}
                    onEdit={handleEdit}
                    editValue={editingKey === field.key ? editValue : ''}
                    isEditing={editingKey === field.key}
                    onStartEdit={() => handleStartEdit(field)}
                    onEndEdit={handleEndEdit}
                    C={C} R={R}
                  />
                ))}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          {!isProcessing && (
            <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 4 }}>
              {missing.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: '#FCEBEB', borderRadius: R.md, padding: 10 }}>
                  <Text style={{ fontSize: 12 }}>⚠️</Text>
                  <Text style={{ fontSize: 12, color: '#A32D2D', flex: 1 }}>
                    Pflichtfeld{missing.length > 1 ? 'er' : ''} fehlen: {missing.join(', ')}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={handleBestaetigen}
                style={{ backgroundColor: C.primary, borderRadius: R.lg, padding: 16,
                  alignItems: 'center', opacity: isProcessing ? 0.5 : 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
                  ✅ Bestätigen & Speichern
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}
                style={{ alignItems: 'center', padding: 10 }}>
                <Text style={{ fontSize: 13, color: C.textSecondary }}>Abbrechen</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
