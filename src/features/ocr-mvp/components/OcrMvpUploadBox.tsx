import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert,
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
  onSubmit: (fileUri: string, fileName: string, mimeType: string, forceType?: OcrMvpForceType, previewUri?: string, source?: string, pageCount?: number) => void;
}

export default function OcrMvpUploadBox({ onSubmit }: Props) {
  const { Colors: C } = useTheme();
  const [selectedAsset, setSelectedAsset] = useState<ScannedAsset | null>(null);
  const [forceType, setForceType] = useState<OcrMvpForceType | null>(null);
  const [picking, setPicking] = useState(false);

  const withPicking = async (fn: () => Promise<ScannedAsset | null>) => {
    setPicking(true);
    try {
      const asset = await fn();
      if (!asset) return;
      setSelectedAsset(asset);
    } catch (e: any) {
      Alert.alert('Scan fehlgeschlagen', e?.message ?? 'Unbekannter Fehler beim Scannen.', [{ text: 'OK' }]);
    } finally {
      setPicking(false);
    }
  };

  const st = styles(C);

  if (selectedAsset) {
    const isCamera = selectedAsset.source === 'camera';
    const isPdf = selectedAsset.mimeType === 'application/pdf';
    const displayTitle = selectedAsset.displayName || (isPdf ? selectedAsset.name : selectedAsset.displayName);

    return (
      <View style={st.container}>
        <View style={st.selectedCard}>
          {selectedAsset.previewUri ? (
            <View style={[st.thumbContainer, { borderColor: C.primary + '30' }]}>
              <Image source={{ uri: selectedAsset.previewUri }} style={st.thumbImage} resizeMode="cover" />
            </View>
          ) : (
            <View style={st.selectedIconCircle}>
              <Icon name={isPdf ? 'document-text' : 'document-outline'} size={28} color={C.primary} />
            </View>
          )}
          <Text style={[st.selectedTitle, { color: C.text }]} numberOfLines={2}>
            {displayTitle}
          </Text>
          <Text style={[st.selectedSub, { color: C.textSecondary }]}>Bereit zur Analyse</Text>
        </View>

        {__DEV__ && (
          <View style={st.devPanel}>
            <Text style={[st.devLabel, { color: C.textTertiary }]}>Developer · Typ überschreiben</Text>
            <View style={st.typeGrid}>
              {FORCE_TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value ?? 'auto'}
                  style={[st.typeChip, { borderColor: C.border, backgroundColor: C.bgCard },
                    forceType === opt.value && { borderColor: C.primary, backgroundColor: C.primary + '18' }]}
                  onPress={() => setForceType(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[st.typeChipLabel, { color: C.textSecondary },
                    forceType === opt.value && { color: C.primary, fontWeight: '600' }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[st.primaryBtn, { backgroundColor: C.primary }]}
          onPress={() => onSubmit(
            selectedAsset.uri,
            selectedAsset.name,
            selectedAsset.mimeType,
            __DEV__ ? (forceType ?? undefined) : undefined,
            selectedAsset.previewUri,
            selectedAsset.source,
            selectedAsset.pageCount,
          )}
          activeOpacity={0.85}
        >
          {picking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="sparkles" size={18} color="#fff" />
              <Text style={st.primaryBtnLabel}>Analysieren</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.changeBtn, { borderColor: C.border }]}
          onPress={() => {
            const src = selectedAsset.source;
            const n = selectedAsset.pageCount ?? 1;
            const needsConfirm = (src === 'scanner' || src === 'camera') && n > 1;

            const reopen = () => {
              if (src === 'scanner' || src === 'camera') {
                withPicking(() => ExpoScannerProvider.takePhotoWithScanner());
              } else if (src === 'photo-library') {
                withPicking(() => ExpoScannerProvider.pickFromLibrary());
              } else {
                withPicking(() => ExpoScannerProvider.pickFile());
              }
            };

            if (needsConfirm) {
              Alert.alert(
                'Scan ersetzen?',
                `Der aktuelle Scan mit ${n} Seiten wird entfernt.`,
                [
                  { text: 'Abbrechen', style: 'cancel' },
                  { text: 'Neu scannen', style: 'destructive', onPress: reopen },
                ],
              );
            } else {
              reopen();
            }
          }}
          activeOpacity={0.75}
        >
          <Text style={[st.changeBtnLabel, { color: C.textSecondary }]}>Ändern</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={st.container}>
      <Text style={[st.headline, { color: C.text }]}>Dokument scannen</Text>
      <Text style={[st.subline, { color: C.textSecondary }]}>
        BriefPilot erkennt Art, Datum, Absender und nächste Schritte automatisch.
      </Text>

      <TouchableOpacity
        style={[st.primaryCard, { backgroundColor: C.bgCard, borderColor: C.primary + '30' }]}
        onPress={() => withPicking(() => ExpoScannerProvider.takePhotoWithScanner())}
        activeOpacity={0.8}
        disabled={picking}
      >
        {picking ? (
          <ActivityIndicator color={C.primary} size="large" />
        ) : (
          <>
            <View style={[st.iconCircle, { backgroundColor: C.primary + '14' }]}>
              <Icon name="camera" size={32} color={C.primary} />
            </View>
            <Text style={[st.cardTitle, { color: C.text }]}>Dokument scannen</Text>
            <Text style={[st.cardSub, { color: C.textSecondary }]}>Automatisch erkennen und ausrichten</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={st.secondaryRow}>
        <TouchableOpacity
          style={[st.secondaryBtn, { borderColor: C.border, backgroundColor: C.bgCard }]}
          onPress={() => withPicking(() => ExpoScannerProvider.pickFile())}
          activeOpacity={0.75}
          disabled={picking}
        >
          <Icon name="document-outline" size={18} color={C.textSecondary} />
          <Text style={[st.secondaryBtnLabel, { color: C.text }]}>Datei auswählen</Text>
          <Text style={[st.secondaryBtnHint, { color: C.textTertiary }]}>PDF · JPG</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.secondaryBtn, { borderColor: C.border, backgroundColor: C.bgCard }]}
          onPress={() => withPicking(() => ExpoScannerProvider.pickFromLibrary())}
          activeOpacity={0.75}
          disabled={picking}
        >
          <Icon name="images-outline" size={18} color={C.textSecondary} />
          <Text style={[st.secondaryBtnLabel, { color: C.text }]}>Aus Fotos</Text>
          <Text style={[st.secondaryBtnHint, { color: C.textTertiary }]}>Aus deiner Fotomediathek</Text>
        </TouchableOpacity>
      </View>

      {__DEV__ && (
        <View style={st.devPanel}>
          <Text style={[st.devLabel, { color: C.textTertiary }]}>Developer · Typ überschreiben</Text>
          <View style={st.typeGrid}>
            {FORCE_TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value ?? 'auto'}
                style={[st.typeChip, { borderColor: C.border, backgroundColor: C.bgCard },
                  forceType === opt.value && { borderColor: C.primary, backgroundColor: C.primary + '18' }]}
                onPress={() => setForceType(opt.value)}
                activeOpacity={0.75}
              >
                <Text style={[st.typeChipLabel, { color: C.textSecondary },
                  forceType === opt.value && { color: C.primary, fontWeight: '600' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container:        { padding: 20, gap: 20 },

  headline:         { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subline:          { fontSize: 14, lineHeight: 21, marginTop: -8 },

  primaryCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 36,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle:        { fontSize: 17, fontWeight: '700' },
  cardSub:          { fontSize: 13 },

  secondaryRow:     { flexDirection: 'row', gap: 12 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  secondaryBtnLabel: { fontSize: 13, fontWeight: '600' },
  secondaryBtnHint:  { fontSize: 11 },

  selectedCard: {
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: C.primary + '40',
    backgroundColor: C.primary + '08',
  },
  selectedIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.primary + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbContainer: {
    width: 72, height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumbImage: { width: '100%', height: '100%' },
  selectedTitle:    { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  selectedSub:      { fontSize: 13 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 16,
  },
  primaryBtnLabel:  { color: '#fff', fontSize: 16, fontWeight: '700' },

  changeBtn: {
    borderWidth: 1, borderRadius: 14, paddingVertical: 13,
    alignItems: 'center', marginTop: -8,
  },
  changeBtnLabel:   { fontSize: 14, fontWeight: '600' },

  devPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingTop: 16,
    gap: 10,
  },
  devLabel:         { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  typeGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1,
  },
  typeChipLabel:    { fontSize: 13 },
});
