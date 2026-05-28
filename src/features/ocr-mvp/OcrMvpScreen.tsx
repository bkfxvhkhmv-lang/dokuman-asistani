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
import type { ScannedPage } from '@/store';
import { ocrMvpToV4Document } from './adapters/ocrMvpToV4Document';
import { useOfflineBannerSuppression } from '@/contexts/OfflineBannerContext';
import OcrMvpUploadBox from './components/OcrMvpUploadBox';
import OcrMvpStatusCard from './components/OcrMvpStatusCard';
import OcrMvpResultCard from './components/OcrMvpResultCard';
import type { OcrMvpForceType } from '@/services/ocrMvpApi';
import type { OcrMvpErrorKind } from '@/hooks/useOcrMvpJob';

type SafeError = { title: string; body: string; icon: string; ctaLabel: string };

function toSafeError(kind: OcrMvpErrorKind, status: string): SafeError {
  if (status === 'timeout' || kind === 'timeout') {
    return {
      title: 'Analyse dauert länger als erwartet',
      body: 'Du kannst es erneut versuchen oder eine andere Datei wählen.',
      icon: 'time-outline',
      ctaLabel: 'Erneut versuchen',
    };
  }
  if (kind === 'network') {
    return {
      title: 'Verbindung zum Analysedienst nicht möglich',
      body: 'Die Analyse ist aktuell nicht verfügbar. Bitte versuche es später erneut.',
      icon: 'wifi-outline',
      ctaLabel: 'Erneut versuchen',
    };
  }
  if (kind === 'server') {
    return {
      title: 'Dokument konnte nicht gelesen werden',
      body: 'Versuche ein schärferes Foto oder eine PDF-Datei.',
      icon: 'document-outline',
      ctaLabel: 'Andere Datei wählen',
    };
  }
  return {
    title: 'Analyse fehlgeschlagen',
    body: 'Bitte versuche es noch einmal.',
    icon: 'alert-circle-outline',
    ctaLabel: 'Erneut versuchen',
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
  const [earlyPersistedDocId, setEarlyPersistedDocId] = useState<string | null>(null);
  const [earlyPersistedPages, setEarlyPersistedPages] = useState<ScannedPage[] | null>(null);
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

  const handleSubmit = async (
    fileUri: string,
    fileName: string,
    mimeType: string,
    forceType?: OcrMvpForceType,
    previewUri?: string,
  ) => {
    setSelectedUri(fileUri);
    setSelectedPreviewUri(previewUri ?? null);
    setEarlyPersistedDocId(null);
    setEarlyPersistedPages(null);

    // Persist the source file immediately — before OCR completes — so the
    // cache URI is never the final stored path regardless of how long OCR takes.
    try {
      const docId = generateId();
      const pages = await persistScanFiles(docId, [fileUri]);
      setEarlyPersistedDocId(docId);
      setEarlyPersistedPages(pages);
    } catch (e) {
      // Early persist failed — handleSaveToDocuments will retry at save time.
      console.error('[OcrMvpScreen] early persist failed', e);
    }

    startJob({ uri: fileUri, name: fileName, mimeType }, forceType);
  };

  const handleSaveToDocuments = useCallback(async () => {
    if (!result || savedDocId) return;
    try {
      // Use early-persisted data if available; otherwise retry persist now.
      let docId = earlyPersistedDocId;
      let persistedPages = earlyPersistedPages;

      if (!docId || !persistedPages?.length) {
        if (!selectedUri) {
          Alert.alert('Speichern fehlgeschlagen', 'Quelldatei konnte nicht gefunden werden.');
          return;
        }
        docId = generateId();
        persistedPages = await persistScanFiles(docId, [selectedUri]);
      }

      // Duplicate check mirrors reducer logic (rohText first 120 chars).
      const draftCheck = ocrMvpToV4Document(result, { id: docId });
      const sig = draftCheck.document.rohText?.slice(0, 120) ?? null;
      const existing = sig
        ? state.dokumente.find(d => d.rohText && d.rohText.slice(0, 120) === sig)
        : null;
      if (existing) {
        setSavedDocId(existing.id);
        return;
      }

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
  }, [result, savedDocId, selectedUri, earlyPersistedDocId, earlyPersistedPages, dispatch, state.dokumente]);

  const handleOpenDocument = useCallback(() => {
    if (!savedDocId) return;
    router.push({ pathname: '/detail', params: { dokId: savedDocId, tab: 'ozet' } });
  }, [savedDocId, router]);

  const handleReset = useCallback(() => {
    setSavedDocId(null);
    setSelectedUri(null);
    setSelectedPreviewUri(null);
    setEarlyPersistedDocId(null);
    setEarlyPersistedPages(null);
    reset();
  }, [reset]);

  const st = styles(Colors);
  const isActive = status !== 'idle';

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={st.header}>
        <Text style={st.title}>Neue Analyse</Text>
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
            <View style={st.errorCard}>
              <Icon name={safeErr.icon} size={24} color="#F59E0B" />
              <Text style={st.errorTitle}>{safeErr.title}</Text>
              <Text style={st.errorMsg}>{safeErr.body}</Text>
              {__DEV__ && error && (
                <Text style={st.errorDebug}>{error}</Text>
              )}
              <TouchableOpacity style={st.retryBtn} onPress={handleReset} activeOpacity={0.8}>
                <Text style={st.retryLabel}>{safeErr.ctaLabel}</Text>
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
                  Analyse wird vorbereitet …
                </Text>
              </View>
            )}

            {health === 'offline' && (
              <View style={st.errorCard}>
                <Icon name="cloud-offline-outline" size={24} color="#F59E0B" />
                <Text style={st.errorTitle}>Analyse nicht verfügbar</Text>
                <Text style={st.errorMsg}>
                  Die Analyse ist aktuell nicht verfügbar. Bitte versuche es später erneut.
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
  errorCard: {
    margin: 20, padding: 24, borderRadius: 16,
    backgroundColor: C.bgCard,
    borderWidth: 1, borderColor: '#F59E0B30',
    alignItems: 'center', gap: 10,
  },
  errorTitle:    { color: C.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  errorMsg:      { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  errorDebug:    { color: C.textTertiary, fontSize: 11, textAlign: 'center', fontFamily: 'monospace', marginTop: 4 },
  retryBtn:      {
    marginTop: 8, paddingVertical: 10, paddingHorizontal: 28,
    backgroundColor: C.bgCard, borderRadius: 12, borderWidth: 1, borderColor: C.border,
  },
  retryLabel:    { color: C.text, fontSize: 14, fontWeight: '600' },
});
