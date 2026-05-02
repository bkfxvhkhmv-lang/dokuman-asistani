import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { type ThemeColors } from '@/ThemeContext';
import type { RadiusTokens } from '@/theme';
import type { AutoFillField, ExtractedFields } from '@/services/SmartAutoFillService';

import { ConfidencePill } from './ConfidencePill';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function formatDisplayValue(raw: string): string {
  if (ISO_DATE_RE.test(raw)) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }
  return raw;
}

interface FieldRowProps {
  field: AutoFillField;
  onEdit: (key: keyof ExtractedFields, val: string) => void;
  editValue: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  C: ThemeColors;
  R: RadiusTokens;
}

export function FieldRow({
  field,
  onEdit,
  editValue,
  isEditing,
  onStartEdit,
  onEndEdit,
  C, R,
}: FieldRowProps) {
  const wertStr        = field.wert === null ? '' : String(field.wert);
  const wertDisplay    = wertStr ? formatDisplayValue(wertStr) : '';
  const isEmpty        = field.wert === null || wertStr === '';
  const conf           = isEmpty ? 'fehlt' : field.confidence;

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
            style={{
              backgroundColor: C.bgInput, borderRadius: R.md, padding: 10,
              fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.primary,
            }}
          />
        ) : (
          <TouchableOpacity
            onPress={onStartEdit}
            style={{
              backgroundColor: isEmpty ? C.bgInput + '80' : C.bgInput, borderRadius: R.md, padding: 10,
              borderWidth: 1, borderColor: isEmpty ? C.dangerBorder : C.border,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, color: isEmpty ? C.textTertiary : C.text, flex: 1 }}>
              {isEmpty ? `${field.label} eingeben…` : wertDisplay}
            </Text>
            <Text style={{ fontSize: 11, color: C.primary }}>✏️</Text>
          </TouchableOpacity>
        )
      ) : (
        <View style={{ backgroundColor: C.bgInput, borderRadius: R.md, padding: 10, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 14, color: C.text }}>{wertDisplay || '–'}</Text>
        </View>
      )}
    </View>
  );
}
