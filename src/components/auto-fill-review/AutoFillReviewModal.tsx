import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useTheme } from '@/ThemeContext';
import type {
  AutoFillField,
  AutoFillResult,
  ExtractedFields,
} from '@/services/SmartAutoFillService';
import type { CategoryResult } from '@/services/SmartCategorizationService';

import { CategoryBadge } from './CategoryBadge';
import { FieldRow } from './FieldRow';
import { KorrekturHintList } from './KorrekturHintList';
import { OverallConfidenceBar } from './OverallConfidenceBar';

interface AutoFillReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onBestaetigen: (edits: Partial<ExtractedFields>) => void;
  autoFillResult: AutoFillResult | null;
  categoryResult: CategoryResult | null;
  isProcessing?: boolean;
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

  const handleClose = () => {
    if (Object.keys(edits).length > 0) {
      Alert.alert(
        'Änderungen verwerfen?',
        'Deine Korrekturen gehen verloren.',
        [
          { text: 'Weiterbearbeiten', style: 'cancel' },
          { text: 'Verwerfen', style: 'destructive', onPress: onClose },
        ],
      );
    } else {
      onClose();
    }
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
    <Modal visible={visible} animationType="fade" transparent presentationStyle="overFullScreen">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
          maxHeight: '92%', paddingBottom: 24 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
            alignSelf: 'center', marginTop: 12, marginBottom: 12 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>
                🤖 KI-Erkennung prüfen
              </Text>
              <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                Alles stimmt? Tippe auf ein Feld zum Bearbeiten.
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.bgInput,
                alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, color: C.textSecondary }}>✕</Text>
            </TouchableOpacity>
          </View>

          {autoFillResult && (
            <OverallConfidenceBar percent={overallConf} C={C} />
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
                {categoryResult && (
                  <CategoryBadge result={categoryResult} C={C} R={R} onAlt={handleCategoryAlt} />
                )}

                {autoFillResult && <KorrekturHintList autoFillResult={autoFillResult} R={R} />}

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
              <TouchableOpacity onPress={handleClose}
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
