import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import IconButton from '@/components/IconButton';
import { useOcrMvpJob } from '@/hooks/useOcrMvpJob';
import OcrMvpUploadBox from './components/OcrMvpUploadBox';
import OcrMvpStatusCard from './components/OcrMvpStatusCard';
import OcrMvpResultCard from './components/OcrMvpResultCard';
import type { OcrMvpForceType } from '@/services/ocrMvpApi';

interface Props {
  onClose?: () => void;
}

export default function OcrMvpScreen({ onClose }: Props) {
  const { Colors } = useTheme();
  const { status, jobId, result, error, startJob, reset } = useOcrMvpJob();

  const handleSubmit = (
    fileUri: string,
    fileName: string,
    mimeType: string,
    forceType?: OcrMvpForceType,
  ) => {
    startJob({ uri: fileUri, name: fileName, mimeType }, forceType);
  };

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
          <OcrMvpStatusCard status={status} jobId={jobId} />
        )}

        {/* Tamamlandı */}
        {status === 'done' && result && (
          <OcrMvpResultCard result={result} onReset={reset} />
        )}

        {/* Hata */}
        {(status === 'error' || status === 'timeout') && (
          <View style={st.errorBox}>
            <Icon name="warning-outline" size={28} color="#FF6B6B" />
            <Text style={st.errorTitle}>
              {status === 'timeout' ? 'Zaman aşımı' : 'Hata oluştu'}
            </Text>
            <Text style={st.errorMsg}>{error}</Text>
            <TouchableOpacity style={st.retryBtn} onPress={reset} activeOpacity={0.8}>
              <Text style={st.retryLabel}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload kutusu — sadece idle durumda */}
        {!isActive && (
          <OcrMvpUploadBox onSubmit={handleSubmit} />
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
  errorBox:      {
    margin: 20, padding: 24, borderRadius: 16,
    backgroundColor: '#FF6B6B18', borderWidth: 1, borderColor: '#FF6B6B40',
    alignItems: 'center', gap: 10,
  },
  errorTitle:    { color: '#FF6B6B', fontSize: 16, fontWeight: '700' },
  errorMsg:      { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  retryBtn:      {
    marginTop: 8, paddingVertical: 10, paddingHorizontal: 28,
    backgroundColor: C.bgCard, borderRadius: 12, borderWidth: 1, borderColor: C.border,
  },
  retryLabel:    { color: C.text, fontSize: 14, fontWeight: '600' },
});
