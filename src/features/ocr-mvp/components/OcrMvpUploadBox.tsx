import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import { ExpoScannerProvider } from '../scanner/ExpoScannerProvider';
import type { ScannedAsset } from '../scanner/types';
import type { OcrMvpForceType } from '@/services/ocrMvpApi';

const FORCE_TYPE_OPTIONS: { value: OcrMvpForceType | null; label: string }[] = [
  { value: null,         label: 'Automatisch' },
  { value: 'invoice',   label: 'Rechnung' },
  { value: 'letter',    label: 'Behördenpost' },
  { value: 'form',      label: 'Formular' },
  { value: 'insurance', label: 'Versicherung / KFZ' },
  { value: 'settlement',label: 'Nebenkosten' },
  { value: 'quote',     label: 'Angebot' },
];

interface Props {
  onSubmit: (fileUri: string, fileName: string, mimeType: string, forceType?: OcrMvpForceType) => void;
}

export default function OcrMvpUploadBox({ onSubmit }: Props) {
  const { Colors } = useTheme();
  const [selectedAsset, setSelectedAsset] = useState<ScannedAsset | null>(null);
  const [forceType, setForceType] = useState<OcrMvpForceType | null>(null);
  const [picking, setPicking] = useState(false);

  const handlePickFile = async () => {
    setPicking(true);
    try {
      const asset = await ExpoScannerProvider.pickFile();
      if (asset) setSelectedAsset(asset);
    } finally {
      setPicking(false);
    }
  };

  const handleTakePhoto = async () => {
    setPicking(true);
    try {
      const asset = await ExpoScannerProvider.takePhoto();
      if (asset) setSelectedAsset(asset);
    } finally {
      setPicking(false);
    }
  };

  const st = styles(Colors);

  return (
    <View style={st.container}>
      {selectedAsset ? (
        <TouchableOpacity style={st.selectedZone} onPress={handlePickFile} activeOpacity={0.75}>
          <Icon name="document-text" size={36} color={Colors.primary} />
          <Text style={st.fileName} numberOfLines={2}>{selectedAsset.displayName}</Text>
          <Text style={st.changeHint}>Zum Ändern tippen</Text>
        </TouchableOpacity>
      ) : (
        <View style={st.pickRow}>
          <TouchableOpacity style={st.pickBtn} onPress={handlePickFile} activeOpacity={0.75} disabled={picking}>
            {picking ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Icon name="document-outline" size={30} color={Colors.primary} />
                <Text style={[st.pickLabel, { color: Colors.text }]}>Datei auswählen</Text>
                <Text style={st.pickHint}>PDF · JPG · PNG</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[st.pickDivider, { backgroundColor: Colors.border }]} />

          <TouchableOpacity style={st.pickBtn} onPress={handleTakePhoto} activeOpacity={0.75} disabled={picking}>
            {picking ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Icon name="camera-outline" size={30} color={Colors.primary} />
                <Text style={[st.pickLabel, { color: Colors.text }]}>Foto aufnehmen</Text>
                <Text style={st.pickHint}>Dokument · Beleg</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {__DEV__ && (
        <>
          <Text style={st.sectionLabel}>Dokumenttyp (Dev)</Text>
          <View style={st.typeGrid}>
            {FORCE_TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value ?? 'auto'}
                style={[st.typeChip, forceType === opt.value && st.typeChipActive]}
                onPress={() => setForceType(opt.value)}
                activeOpacity={0.75}
              >
                <Text style={[st.typeChipLabel, forceType === opt.value && st.typeChipLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity
        style={[st.submitBtn, !selectedAsset && st.submitBtnDisabled]}
        onPress={() => {
          if (selectedAsset) {
            onSubmit(
              selectedAsset.uri,
              selectedAsset.name,
              selectedAsset.mimeType,
              __DEV__ ? (forceType ?? undefined) : undefined,
            );
          }
        }}
        disabled={!selectedAsset}
        activeOpacity={0.8}
      >
        <Text style={st.submitLabel}>Analysieren</Text>
        <Icon name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container:    { padding: 20, gap: 16 },
  pickRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: C.bgCard,
    overflow: 'hidden',
  },
  pickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  pickDivider:   { width: 1 },
  pickLabel:     { fontSize: 14, fontWeight: '600' },
  pickHint:      { color: C.textSecondary, fontSize: 11 },
  selectedZone: {
    borderWidth: 1.5,
    borderColor: C.primary,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.bgCard,
  },
  fileName:      { color: C.text, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  changeHint:    { color: C.textSecondary, fontSize: 12 },
  sectionLabel:  { color: C.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  typeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:      {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bgCard,
  },
  typeChipActive:      { borderColor: C.primary, backgroundColor: C.primary + '18' },
  typeChipLabel:       { color: C.textSecondary, fontSize: 13 },
  typeChipLabelActive: { color: C.primary, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitLabel:       { color: '#fff', fontSize: 16, fontWeight: '700' },
});
