import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { OcrMvpForceType } from '@/services/ocrMvpApi';

const FORCE_TYPE_OPTIONS: { value: OcrMvpForceType | null; label: string }[] = [
  { value: null,         label: 'Otomatik' },
  { value: 'invoice',   label: 'Fatura' },
  { value: 'letter',    label: 'Resmi Yazı' },
  { value: 'form',      label: 'Form' },
  { value: 'insurance', label: 'Sigorta / KFZ' },
  { value: 'settlement',label: 'Nebenkosten' },
  { value: 'quote',     label: 'Teklif' },
];

interface Props {
  onSubmit: (fileUri: string, fileName: string, mimeType: string, forceType?: OcrMvpForceType) => void;
}

export default function OcrMvpUploadBox({ onSubmit }: Props) {
  const { Colors } = useTheme();
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [forceType, setForceType] = useState<OcrMvpForceType | null>(null);
  const [picking, setPicking] = useState(false);

  const pickFile = async () => {
    setPicking(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets.length > 0) {
        const asset = res.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name ?? 'document',
          mimeType: asset.mimeType ?? 'application/pdf',
        });
      }
    } finally {
      setPicking(false);
    }
  };

  const takePhoto = async () => {
    setPicking(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 1,
      });
      if (!res.canceled && res.assets.length > 0) {
        const asset = res.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        });
      }
    } finally {
      setPicking(false);
    }
  };

  const st = styles(Colors);

  return (
    <View style={st.container}>
      {selectedFile ? (
        <TouchableOpacity style={st.selectedZone} onPress={pickFile} activeOpacity={0.75}>
          <Icon name="document-text" size={36} color={Colors.primary} />
          <Text style={st.fileName} numberOfLines={2}>{selectedFile.name}</Text>
          <Text style={st.changeHint}>Değiştirmek için dokun</Text>
        </TouchableOpacity>
      ) : (
        <View style={st.pickRow}>
          <TouchableOpacity style={st.pickBtn} onPress={pickFile} activeOpacity={0.75} disabled={picking}>
            {picking ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Icon name="document-outline" size={30} color={Colors.primary} />
                <Text style={[st.pickLabel, { color: Colors.text }]}>Dosya Seç</Text>
                <Text style={st.pickHint}>PDF · JPG · PNG</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[st.pickDivider, { backgroundColor: Colors.border }]} />

          <TouchableOpacity style={st.pickBtn} onPress={takePhoto} activeOpacity={0.75} disabled={picking}>
            {picking ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Icon name="camera-outline" size={30} color={Colors.primary} />
                <Text style={[st.pickLabel, { color: Colors.text }]}>Fotoğraf Çek</Text>
                <Text style={st.pickHint}>Belge · Makbuz</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Text style={st.sectionLabel}>Belge tipi</Text>
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

      <TouchableOpacity
        style={[st.submitBtn, !selectedFile && st.submitBtnDisabled]}
        onPress={() => {
          if (selectedFile) {
            onSubmit(selectedFile.uri, selectedFile.name, selectedFile.mimeType, forceType ?? undefined);
          }
        }}
        disabled={!selectedFile}
        activeOpacity={0.8}
      >
        <Text style={st.submitLabel}>İşle</Text>
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
