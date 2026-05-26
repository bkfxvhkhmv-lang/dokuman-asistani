import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import IconButton from '@/components/IconButton';
import { OCR_MVP_BASE } from '@/config';
import { useOcrMvpJob } from '@/hooks/useOcrMvpJob';
import { useStore } from '@/store';
import { generateId } from '@/utils';
import { persistScanFiles } from '@/modules/scanner/storage/scanFileStorage';
import { ocrMvpToV4Document } from './adapters/ocrMvpToV4Document';
import { useOfflineBannerSuppression } from '@/contexts/OfflineBannerContext';
import OcrMvpUploadBox from './components/OcrMvpUploadBox';
import OcrMvpStatusCard from './components/OcrMvpStatusCard';
import OcrMvpResultCard from './components/OcrMvpResultCard';
import type { OcrMvpForceType } from '@/services/ocrMvpApi';
import type { OcrMvpErrorKind } from '@/hooks/useOcrMvpJob';

type SafeError = { title: string; body: string };

function toSafeError(kind: OcrMvpErrorKind, status: string): SafeError {
  if (status === 'timeout' || kind === 'timeout') {
    return {
      title: 'Analyse-Server nicht erreichbar',
      body: 'Bitte prüfe, ob Mac und iPhone im selben WLAN sind und der OCR-Backend-Server läuft.',
    };
  }
  if (kind === 'network') {
    return {
      title: 'Analyse-Server nicht erreichbar',
      body: 'Bitte prüfe, ob Mac und iPhone im selben WLAN sind und der OCR-Backend-Server läuft.',
    };
  }
  if (kind === 'server') {
    return {
      title: 'Analyse konnte nicht abgeschlossen werden',
      body: 'Der Server konnte das Dokument nicht verarbeiten. Bitte versuche es erneut oder prüfe die Backend-Konfiguration.',
    };
  }
  return {
    title: 'Unerwarteter Fehler',
    body: 'Die Analyse konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
  };
}

type HealthState = 'checking' | 'online' | 'offline';

interface Props {
  onClose?: () => void;
}

export default function OcrMvpScreen({ onClose }: Props) {
  const { Colors } = useTheme();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const { status, result, error, errorKind, startJob, reset } = useOcrMvpJob();
  const [health, setHealth] = useState<HealthState>('checking');
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedPreviewUri, setSelectedPreviewUri] = useState<string | null>(null);
  const { setSuppressBanner } = useOfflineBannerSuppression();

  useEffect(() => {
    setSuppressBanner(true);
    return () => setSuppressBanner(false);
  }, [setSuppressBanner]);

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

  useEffect(() => {
    if ((status === 'error' || status === 'timeout') && error && __DEV__) {
      console.warn('[OcrMvpScreen] Analysefehler (intern, nicht im UI):', error);
    }
  }, [status, error]);

  const handleSubmit = (
    fileUri: string,
    fileName: string,
    mimeType: string,
    forceType?: OcrMvpForceType,
    previewUri?: string,
  ) => {
    setSelectedUri(fileUri);
    setSelectedPreviewUri(previewUri ?? null);
    startJob({ uri: fileUri, name: fileName, mimeType }, forceType);
  };

  const handleSaveToDocuments = useCallback(async () => {
    if (!result || savedDocId) return;
    if (!selectedUri) {
      Alert.alert('Speichern fehlgeschlagen', 'Quelldatei konnte nicht gefunden werden.');
      return;
    }
    try {
      const docId = generateId();
      // Duplicate check mirrors reducer logic (rohText first 120 chars).
      // Do this before persisting files to avoid orphaned scan data.
      const draftCheck = ocrMvpToV4Document(result, { id: docId });
      const sig = draftCheck.document.rohText?.slice(0, 120) ?? null;
      const existing = sig
        ? state.dokumente.find(d => d.rohText && d.rohText.slice(0, 120) === sig)
        : null;
      if (existing) {
        setSavedDocId(existing.id);
        return;
      }
      const persistedPages = await persistScanFiles(docId, [selectedUri]);
      const draft = ocrMvpToV4Document(result, {
        id:    docId,
        uri:   persistedPages[0]?.uri ?? null,
        pages: persistedPages,
      });
      dispatch({ type: 'ADD_DOKUMENT', payload: draft.document });
      setSavedDocId(draft.document.id);
    } catch (e: any) {
      Alert.alert('Speichern fehlgeschlagen', e?.message ?? 'Dokument konnte nicht gespeichert werden.');
    }
  }, [result, savedDocId, selectedUri, dispatch, state.dokumente]);

  const handleOpenDocument = useCallback(() => {
    if (!savedDocId) return;
    router.push({ pathname: '/detail', params: { dokId: savedDocId } });
  }, [savedDocId, router]);

  const handleReset = useCallback(() => {
    setSavedDocId(null);
    setSelectedUri(null);
    setSelectedPreviewUri(null);
    reset();
  }, [reset]);

  const st = styles(Colors);
  const isActive = status !== 'idle';

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <Text style={st.title}>BriefPilot OCR</Text>
        {onClose && (
          <IconButton onPress={onClose} accessibilityLabel="Schließen">
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
          <OcrMvpStatusCard status={status} previewUri={selectedPreviewUri ?? undefined} />
        )}

        {/* Tamamlandı */}
        {status === 'done' && result && (
          <OcrMvpResultCard
            result={result}
            onReset={handleReset}
            onSaveToDocuments={handleSaveToDocuments}
            isSavedToDocuments={!!savedDocId}
            onOpenDocument={savedDocId ? handleOpenDocument : undefined}
          />
        )}

        {/* Fehler */}
        {(status === 'error' || status === 'timeout') && (() => {
          const safeErr = toSafeError(errorKind, status);
          return (
            <View style={st.errorBox}>
              <Icon name="warning-outline" size={28} color="#FF6B6B" />
              <Text style={st.errorTitle}>{safeErr.title}</Text>
              <Text style={st.errorMsg}>{safeErr.body}</Text>
              <TouchableOpacity style={st.retryBtn} onPress={handleReset} activeOpacity={0.8}>
                <Text style={st.retryLabel}>Erneut versuchen</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Idle durumda: health check + upload box */}
        {!isActive && (
          <>
            {health === 'checking' && (
              <View style={st.checkingBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={[st.checkingLabel, { color: Colors.textSecondary }]}>
                  Analyse-Server wird geprüft …
                </Text>
              </View>
            )}

            {health === 'offline' && (
              <View style={st.errorBox}>
                <Icon name="cloud-offline-outline" size={36} color="#FF6B6B" />
                <Text style={st.errorTitle}>Analyse-Server nicht erreichbar</Text>
                <Text style={st.errorMsg}>
                  Bitte prüfe, ob Mac und iPhone im selben WLAN sind und der OCR-Backend-Server läuft.
                </Text>
                <TouchableOpacity style={st.retryBtn} onPress={checkHealth} activeOpacity={0.8}>
                  <Text style={st.retryLabel}>Erneut versuchen</Text>
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
