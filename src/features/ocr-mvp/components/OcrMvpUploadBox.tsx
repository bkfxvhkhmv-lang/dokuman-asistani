import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import { useT } from '@/hooks/useT';
import { ExpoScannerProvider } from '../scanner/ExpoScannerProvider';
import type { ScannedAsset } from '../scanner/types';
import type { OcrMvpForceType } from '@/services/ocrMvpApi';
import { toUserFacingOcrMessage } from '../domain/userFacingErrors';

interface Props {
  onSubmit: (fileUri: string, fileName: string, mimeType: string, forceType?: OcrMvpForceType, previewUri?: string, source?: string, pageCount?: number) => void;
  onBatchAnalyze?: (assets: ScannedAsset[]) => void | Promise<void>;
  onSaveWithoutAnalysis?: (asset: ScannedAsset) => void | Promise<void>;
  onScannerPresentingChange?: (presenting: boolean) => void;
  saveWithoutAnalysisBusy?: boolean;
  batchBusy?: boolean;
}

export default function OcrMvpUploadBox({
  onSubmit,
  onBatchAnalyze,
  onSaveWithoutAnalysis,
  onScannerPresentingChange,
  saveWithoutAnalysisBusy = false,
  batchBusy = false,
}: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  const [selectedAsset, setSelectedAsset] = useState<ScannedAsset | null>(null);
  const [picking, setPicking] = useState(false);

  const withPicking = async (fn: () => Promise<ScannedAsset | null>) => {
    setPicking(true);
    onScannerPresentingChange?.(true);
    try {
      const asset = await fn();
      if (!asset) return;
      setSelectedAsset(asset);
    } catch (e: any) {
      Alert.alert(T('ocr.upload.scan_error_title'), toUserFacingOcrMessage(e?.message, T, 'ocr.upload.scan_error_body'), [{ text: T('common.ok') }]);
    } finally {
      setPicking(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          onScannerPresentingChange?.(false);
        });
      });
    }
  };

  const st = styles(C);

  if (selectedAsset) {
    const isPdf = selectedAsset.mimeType === 'application/pdf';
    const displayTitle = selectedAsset.displayName || (isPdf ? selectedAsset.name : selectedAsset.displayName);

    const handleÄndern = () => {
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
          T('ocr.upload.replace_title'),
          T('ocr.upload.replace_body', { n }),
          [
            { text: T('common.cancel'), style: 'cancel' },
            { text: T('ocr.upload.rescan'), style: 'destructive', onPress: reopen },
          ],
        );
      } else {
        reopen();
      }
    };

    const handleDiscardSelection = () => {
      setSelectedAsset(null);
    };

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
          <Text style={[st.selectedSub, { color: C.textSecondary }]}>{T('ocr.upload.ready')}</Text>
        </View>

        {onSaveWithoutAnalysis && (
          <TouchableOpacity
            style={[st.saveWithoutBtn, { borderColor: C.primary, backgroundColor: C.primary + '12' }]}
            onPress={() => void onSaveWithoutAnalysis(selectedAsset)}
            activeOpacity={0.85}
            disabled={picking || saveWithoutAnalysisBusy}
          >
            {saveWithoutAnalysisBusy ? (
              <ActivityIndicator color={C.primary} />
            ) : (
              <>
                <Icon name="archive" size={18} color={C.primary} />
                <Text style={[st.saveWithoutBtnLabel, { color: C.primary }]}>
                  {T('ocr.upload.save_without_analysis')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[st.primaryBtn, { backgroundColor: C.primary }]}
          onPress={() => onSubmit(
            selectedAsset.uri,
            selectedAsset.name,
            selectedAsset.mimeType,
            undefined,
            selectedAsset.previewUri,
            selectedAsset.source,
            selectedAsset.pageCount,
          )}
          activeOpacity={0.85}
          disabled={picking || saveWithoutAnalysisBusy}
        >
          {picking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="sparkles" size={18} color="#fff" />
              <Text style={st.primaryBtnLabel}>{T('ocr.upload.analyze')}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.changeBtn, { borderColor: C.border }]}
          onPress={handleÄndern}
          activeOpacity={0.75}
          disabled={saveWithoutAnalysisBusy}
        >
          <Text style={[st.changeBtnLabel, { color: C.textSecondary }]}>{T('ocr.upload.change')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.discardBtn, { borderColor: C.border }]}
          onPress={handleDiscardSelection}
          activeOpacity={0.75}
          disabled={saveWithoutAnalysisBusy}
        >
          <Text style={[st.discardBtnLabel, { color: C.textSecondary }]}>{T('ocr.upload.discard_selection')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={st.container}>
      <Text style={[st.headline, { color: C.text }]}>{T('ocr.upload.headline')}</Text>
      <Text style={[st.subline, { color: C.textSecondary }]}>
        {T('ocr.upload.description')}
      </Text>

      <TouchableOpacity
        style={[st.primaryCard, { backgroundColor: C.bgCard, borderColor: C.primary + '30' }]}
        onPress={() => withPicking(() => ExpoScannerProvider.takePhotoWithScanner())}
        activeOpacity={0.8}
        disabled={picking || batchBusy}
      >
        {picking ? (
          <ActivityIndicator color={C.primary} size="large" />
        ) : (
          <>
            <View style={[st.iconCircle, { backgroundColor: C.primary + '14' }]}>
              <Icon name="camera" size={32} color={C.primary} />
            </View>
            <Text style={[st.cardTitle, { color: C.text }]}>{T('ocr.upload.scan_title')}</Text>
            <Text style={[st.cardSub, { color: C.textSecondary }]}>{T('ocr.upload.scan_sub')}</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={st.secondaryRow}>
        <TouchableOpacity
          style={[st.secondaryBtn, { borderColor: C.border, backgroundColor: C.bgCard }]}
          onPress={() => withPicking(() => ExpoScannerProvider.pickFile())}
          activeOpacity={0.75}
          disabled={picking || batchBusy}
        >
          <Icon name="document-outline" size={18} color={C.textSecondary} />
          <Text style={[st.secondaryBtnLabel, { color: C.text }]}>{T('ocr.upload.file_label')}</Text>
          <Text style={[st.secondaryBtnHint, { color: C.textTertiary }]}>{T('ocr.upload.file_hint')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[st.secondaryBtn, { borderColor: C.border, backgroundColor: C.bgCard }]}
          onPress={() => withPicking(() => ExpoScannerProvider.pickFromLibrary())}
          activeOpacity={0.75}
          disabled={picking || batchBusy}
        >
          <Icon name="images-outline" size={18} color={C.textSecondary} />
          <Text style={[st.secondaryBtnLabel, { color: C.text }]}>{T('ocr.upload.photo_label')}</Text>
          <Text style={[st.secondaryBtnHint, { color: C.textTertiary }]}>{T('ocr.upload.photo_hint')}</Text>
        </TouchableOpacity>
      </View>

      {onBatchAnalyze && (
        <TouchableOpacity
          style={[st.multiFileBtn, { borderColor: C.border, backgroundColor: C.bgCard }]}
          onPress={() => {
            if (picking || batchBusy) return;
            setPicking(true);
            onScannerPresentingChange?.(true);
            void (async () => {
              try {
                const assets = await ExpoScannerProvider.pickFiles();
                if (assets.length > 0) {
                  await onBatchAnalyze(assets);
                }
              } catch (e: any) {
                Alert.alert(T('ocr.upload.scan_error_title'), toUserFacingOcrMessage(e?.message, T, 'ocr.upload.scan_error_body'), [{ text: T('common.ok') }]);
              } finally {
                setPicking(false);
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    onScannerPresentingChange?.(false);
                  });
                });
              }
            })();
          }}
          activeOpacity={0.75}
          disabled={picking || batchBusy}
        >
          <Icon name="documents-outline" size={18} color={C.textSecondary} />
          <Text style={[st.secondaryBtnLabel, { color: C.text }]}>{T('ocr.upload.multi_files_label')}</Text>
          <Text style={[st.secondaryBtnHint, { color: C.textTertiary }]}>{T('ocr.upload.multi_files_hint')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container:        { padding: 20, gap: 12 },
  headline:         { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  subline:          { fontSize: 13, lineHeight: 19, marginTop: -4 },
  primaryCard: {
    borderWidth: 1.5, borderRadius: 20, paddingVertical: 22, alignItems: 'center', gap: 10,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
  },
  cardTitle:        { fontSize: 17, fontWeight: '700' },
  cardSub:          { fontSize: 13 },
  secondaryRow:     { flexDirection: 'row', gap: 12 },
  secondaryBtn: {
    flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 6,
  },
  secondaryBtnLabel: { fontSize: 13, fontWeight: '600' },
  secondaryBtnHint:  { fontSize: 11 },
  selectedCard: {
    borderRadius: 20, paddingVertical: 32, paddingHorizontal: 24,
    alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: C.primary + '40', backgroundColor: C.primary + '08',
  },
  selectedIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.primary + '14', alignItems: 'center', justifyContent: 'center',
  },
  thumbContainer: {
    width: 72, height: 88, borderRadius: 10, overflow: 'hidden', borderWidth: 1,
  },
  thumbImage:       { width: '100%', height: '100%' },
  selectedTitle:    { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  selectedSub:      { fontSize: 13 },
  saveWithoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15, borderWidth: 1.5,
  },
  saveWithoutBtnLabel: { fontSize: 15, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 16,
  },
  primaryBtnLabel:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  changeBtn: {
    borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: -8,
  },
  changeBtnLabel:   { fontSize: 14, fontWeight: '600' },
  discardBtn: {
    borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: -4,
  },
  discardBtnLabel:  { fontSize: 13, fontWeight: '600' },
  multiFileBtn: {
    borderWidth: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 6,
  },
});
