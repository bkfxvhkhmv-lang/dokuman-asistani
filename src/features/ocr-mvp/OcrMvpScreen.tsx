import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import IconButton from '@/components/IconButton';
import { OCR_MVP_BASE } from '@/config';
import { useOcrMvpJob } from '@/hooks/useOcrMvpJob';
import { useStore } from '@/store';
import { ocrMvpToV4Document } from './adapters/ocrMvpToV4Document';
import OcrMvpUploadBox from './components/OcrMvpUploadBox';
import OcrMvpStatusCard from './components/OcrMvpStatusCard';
import OcrMvpResultCard from './components/OcrMvpResultCard';
import type { OcrMvpForceType } from '@/services/ocrMvpApi';

type HealthState = 'checking' | 'online' | 'offline';

interface Props {
  onClose?: () => void;
}

export default function OcrMvpScreen({ onClose }: Props) {
  const { Colors } = useTheme();
  const { dispatch } = useStore();
  const { status, result, error, startJob, reset } = useOcrMvpJob();
  const [health, setHealth] = useState<HealthState>('checking');
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setHealth('checking');
    try {
      const res = await Promise.race([
        fetch(`${OCR_MVP_BASE}/health`),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000),
        ),
      ]);
      setHealth((res as Response).ok ? 'online' : 'offline');
    } catch {
      setHealth('offline');
    }
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const handleSubmit = (
    fileUri: string,
    fileName: string,
    mimeType: string,
    forceType?: OcrMvpForceType,
  ) => {
    startJob({ uri: fileUri, name: fileName, mimeType }, forceType);
  };

  const handleSaveToDocuments = useCallback(() => {
    if (!result || savedDocId) return;
    try {
      const draft = ocrMvpToV4Document(result);
      dispatch({ type: 'ADD_DOKUMENT', payload: draft.document });
      setSavedDocId(draft.document.id);
    } catch (e: any) {
      Alert.alert('Kayıt hatası', e?.message ?? 'Belge kaydedilemedi.');
    }
  }, [result, savedDocId, dispatch]);

  const handleReset = useCallback(() => {
    setSavedDocId(null);
    reset();
  }, [reset]);

  const st = styles(Colors);
  const isActive = status !== 'idle';

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <Text style={st.title}>BriefPilot OCR</Text>
        {onClose && (
          <IconButton onPress={onClose} accessibilityLabel="Kapat">
            <Icon name="close" size={22} color={Colors.textSecondary} />
          </IconButton>
        )}
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Yükleme ve işleme */}
        {(status === 'uploading' || status === 'processing') && (
          <OcrMvpStatusCard status={status} />
        )}

        {/* Tamamlandı */}
        {status === 'done' && result && (
          <OcrMvpResultCard
            result={result}
            onReset={handleReset}
            onSaveToDocuments={handleSaveToDocuments}
            isSavedToDocuments={!!savedDocId}
          />
        )}

        {/* Hata */}
        {(status === 'error' || status === 'timeout') && (
          <View style={st.errorBox}>
            <Icon name="warning-outline" size={28} color="#FF6B6B" />
            <Text style={st.errorTitle}>
              {status === 'timeout' ? 'İşlem zaman aşımına uğradı' : 'Bir hata oluştu'}
            </Text>
            <Text style={st.errorMsg}>{error}</Text>
            <TouchableOpacity style={st.retryBtn} onPress={handleReset} activeOpacity={0.8}>
              <Text style={st.retryLabel}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Idle durumda: health check + upload box */}
        {!isActive && (
          <>
            {health === 'checking' && (
              <View style={st.checkingBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={[st.checkingLabel, { color: Colors.textSecondary }]}>
                  Analiz sunucusu kontrol ediliyor...
                </Text>
              </View>
            )}

            {health === 'offline' && (
              <View style={st.errorBox}>
                <Icon name="cloud-offline-outline" size={36} color="#FF6B6B" />
                <Text style={st.errorTitle}>Analiz sunucusuna bağlanılamıyor</Text>
                <Text style={st.errorMsg}>
                  Mac ve iPhone aynı Wi-Fi ağında mı?{'\n'}Backend çalışıyor mu?
                </Text>
                <TouchableOpacity style={st.retryBtn} onPress={checkHealth} activeOpacity={0.8}>
                  <Text style={st.retryLabel}>Tekrar Dene</Text>
                </TouchableOpacity>
              </View>
            )}

            {health === 'online' && (
              <OcrMvpUploadBox onSubmit={handleSubmit} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  header:        {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  title:         { color: C.text, fontSize: 18, fontWeight: '700' },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  checkingBox:   { alignItems: 'center', padding: 48, gap: 16 },
  checkingLabel: { fontSize: 14 },
  errorBox:      {
    margin: 20, padding: 24, borderRadius: 16,
    backgroundColor: '#FF6B6B18', borderWidth: 1, borderColor: '#FF6B6B40',
    alignItems: 'center', gap: 10,
  },
  errorTitle:    { color: '#FF6B6B', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  errorMsg:      { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn:      {
    marginTop: 8, paddingVertical: 10, paddingHorizontal: 28,
    backgroundColor: C.bgCard, borderRadius: 12, borderWidth: 1, borderColor: C.border,
  },
  retryLabel:    { color: C.text, fontSize: 14, fontWeight: '600' },
});
