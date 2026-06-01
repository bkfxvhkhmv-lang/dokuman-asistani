import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { postAcceptedSnapshot } from '@/services/ocrMvpApi';
import type { OcrMvpErrorKind } from '@/hooks/useOcrMvpJob';
import { useT } from '@/hooks/useT';

type SafeError = { title: string; body: string; icon: string; ctaLabel: string };

function toSafeError(kind: OcrMvpErrorKind, status: string, T: (k: string) => string): SafeError {
  if (status === 'timeout' || kind === 'timeout') {
    return {
      title:    T('ocr.error.timeout.title'),
      body:     T('ocr.error.timeout.body'),
      icon:     'time-outline',
      ctaLabel: T('ocr.error.cta.retry'),
    };
  }
  if (kind === 'network') {
    return {
      title:    T('ocr.error.network.title'),
      body:     T('ocr.error.network.body'),
      icon:     'wifi-outline',
      ctaLabel: T('ocr.error.cta.retry'),
    };
  }
  if (kind === 'server') {
    return {
      title:    T('ocr.error.server.title'),
      body:     T('ocr.error.server.body'),
      icon:     'document-outline',
      ctaLabel: T('ocr.error.server.cta'),
    };
  }
  return {
    title:    T('ocr.error.generic.title'),
    body:     T('ocr.error.generic.body'),
    icon:     'alert-circle-outline',
    ctaLabel: T('ocr.error.cta.retry'),
  };
}

type HealthState = 'checking' | 'online' | 'offline';

interface Props {
  onClose?: () => void;
}

type TimingMarks = Partial<Record<
  | 'scanReceived'
  | 'mounted'
  | 'uploadStart'
  | 'uploadEnd'
  | 'jobCreated'
  | 'pollStart'
  | 'pollResult'
  | 'resultVisible'
  | 'parseDone'
  | 'saveDone'
  | 'navDone',
  number
>>;

export default function OcrMvpScreen({ onClose }: Props) {
  const { Colors } = useTheme();
  const { t: T } = useT();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const { status, jobId, result, error, errorKind, startJob, reset } = useOcrMvpJob();
  const [health, setHealth] = useState<HealthState>('checking');
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedPreviewUri, setSelectedPreviewUri] = useState<string | null>(null);
  const [earlyPersistedDocId, setEarlyPersistedDocId] = useState<string | null>(null);
  const [earlyPersistedPages, setEarlyPersistedPages] = useState<ScannedPage[] | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { setSuppressBanner } = useOfflineBannerSuppression();
  const timingRef = useRef<TimingMarks>({});

  const setTiming = useCallback((key: keyof TimingMarks, value = Date.now()) => {
    timingRef.current[key] = value;
  }, []);

  const secondsBetween = useCallback((from?: number, to?: number) => {
    if (!from || !to || to < from) return null;
    return ((to - from) / 1000).toFixed(1);
  }, []);

  const emitTimingSummary = useCallback((finalLabel?: string) => {
    if (!__DEV__) return;
    const t = timingRef.current;
    const scanStart = t.scanReceived ?? t.mounted;
    const total = secondsBetween(scanStart, finalLabel === 'navDone' ? t.navDone : t.resultVisible ?? t.saveDone ?? t.pollResult);
    const upload = secondsBetween(t.uploadStart, t.uploadEnd);
    const job = secondsBetween(t.uploadEnd, t.jobCreated);
    const polling = secondsBetween(t.pollStart, t.pollResult);
    const parse = secondsBetween(t.pollResult, t.parseDone);
    const save = secondsBetween(t.parseDone ?? t.pollResult, t.saveDone);
    const nav = secondsBetween(t.saveDone ?? t.resultVisible, t.navDone);
    const parts = [
      total ? `total=${total}s` : null,
      upload ? `upload=${upload}s` : null,
      job ? `job=${job}s` : null,
      polling ? `polling=${polling}s` : null,
      parse ? `parse=${parse}s` : null,
      save ? `save=${save}s` : null,
      nav ? `nav=${nav}s` : null,
      finalLabel ? `final=${finalLabel}` : null,
    ].filter(Boolean);
    console.log(`[OCR_TIMING] ${parts.join(' ')}`);
  }, [secondsBetween]);

  useEffect(() => {
    setSuppressBanner(true);
    return () => setSuppressBanner(false);
  }, [setSuppressBanner]);

  useEffect(() => {
    setTiming('mounted');
  }, [setTiming]);

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
    sourceType?: string,
    pageCount?: number,
  ) => {
    setTiming('scanReceived');
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

    startJob(
      { uri: fileUri, name: fileName, mimeType },
      forceType,
      { sourceType, pageCount },
      {
        onUploadStart:   () => setTiming('uploadStart'),
        onUploadFinished: () => setTiming('uploadEnd'),
        onJobCreated:    () => setTiming('jobCreated'),
        onPollingStarted: () => setTiming('pollStart'),
        onPollingResult: () => setTiming('pollResult'),
      },
    );
  };

  const handleSaveToDocuments = useCallback(async () => {
    if (!result || savedDocId) return;
    try {
      // Use early-persisted data if available; otherwise retry persist now.
      let docId = earlyPersistedDocId;
      let persistedPages = earlyPersistedPages;

      if (!docId || !persistedPages?.length) {
        if (!selectedUri) {
          Alert.alert(T('ocr.save.error.title'), T('ocr.save.error.source'));
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
        id:               docId,
        uri:              persistedPages[0]?.uri ?? null,
        fileRelativePath: persistedPages[0]?.relativePath ?? null,
        pages:            persistedPages,
      });
      setTiming('parseDone');
      dispatch({ type: 'ADD_DOKUMENT', payload: draft.document });
      setSavedDocId(draft.document.id);
      setTiming('saveDone');
      emitTimingSummary('saveDone');

      // Learning loop — fire-and-forget, never blocks save flow
      const doc = draft.document;
      void postAcceptedSnapshot(jobId, {
        final_kind:     doc.typ ?? null,
        final_language: doc.detectedLanguage ?? result.language ?? null,
        final_fields: {
          titel:    doc.titel   ?? null,
          absender: doc.absender ?? null,
          betrag:   doc.betrag  ?? null,
          frist:    doc.frist   ?? null,
          iban:     doc.iban    ?? null,
          risiko:   doc.risiko  ?? null,
        },
      }).catch((e) => console.warn('[learning] accepted snapshot failed', e));
    } catch (e: any) {
      Alert.alert(T('ocr.save.error.title'), e?.message ?? T('ocr.save.error.generic'));
    }
  }, [result, jobId, savedDocId, selectedUri, earlyPersistedDocId, earlyPersistedPages, dispatch, state.dokumente]);

  const handleOpenDocument = useCallback(() => {
    if (!savedDocId) return;
    setTiming('navDone');
    emitTimingSummary('navDone');
    router.push({ pathname: '/detail', params: { dokId: savedDocId, tab: 'ozet' } });
  }, [savedDocId, router, emitTimingSummary, setTiming]);

  const handleReset = useCallback(() => {
    setSavedDocId(null);
    setSelectedUri(null);
    setSelectedPreviewUri(null);
    setEarlyPersistedDocId(null);
    setEarlyPersistedPages(null);
    timingRef.current = {};
    reset();
  }, [reset]);

  useEffect(() => {
    if (status === 'done' && result) {
      setTiming('resultVisible');
      emitTimingSummary('resultVisible');
    }
  }, [status, result, emitTimingSummary, setTiming]);

  const st = styles(Colors);
  const isActive = status !== 'idle';
  const hideIdleChrome = scannerOpen && !isActive;

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={[st.header, hideIdleChrome && st.headerHidden]} pointerEvents={hideIdleChrome ? 'none' : 'auto'}>
        <Text style={st.title}>Analysieren</Text>
        {onClose && (
          <IconButton onPress={onClose} accessibilityLabel="Schließen">
            <Icon name="close" size={22} color={Colors.textSecondary} />
          </IconButton>
        )}
      </View>

      {/* Analiz sırasında tam ekran ortalı state — ScrollView değil */}
      {(status === 'uploading' || status === 'processing') && (
        <View style={st.centeredState}>
          <OcrMvpStatusCard status={status} previewUri={selectedPreviewUri ?? undefined} />
        </View>
      )}

      <ScrollView
        style={[st.scroll, (status === 'uploading' || status === 'processing') && { display: 'none' }]}
        contentContainerStyle={st.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Yükleme ve işleme — ScrollView içinde artık gösterilmiyor */}
        {false && (
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
          const safeErr = toSafeError(errorKind, status, T);
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
          <View style={hideIdleChrome ? st.idleChromeHidden : undefined} pointerEvents={hideIdleChrome ? 'none' : 'auto'}>
            {health === 'checking' && (
              <View style={st.checkingBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={[st.checkingLabel, { color: Colors.textSecondary }]}>
                  {T('ocr.preparing')}
                </Text>
              </View>
            )}

            {health === 'offline' && (
              <View style={st.errorCard}>
                <Icon name="cloud-offline-outline" size={24} color="#F59E0B" />
                <Text style={st.errorTitle}>{T('ocr.offline.title')}</Text>
                <Text style={st.errorMsg}>{T('ocr.offline.body')}</Text>
                <TouchableOpacity style={st.retryBtn} onPress={checkHealth} activeOpacity={0.8}>
                  <Text style={st.retryLabel}>{T('ocr.error.cta.retry')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {health === 'online' && (
              <OcrMvpUploadBox onSubmit={handleSubmit} onScannerPresentingChange={setScannerOpen} />
            )}
          </View>
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
  headerHidden:  { opacity: 0 },
  idleChromeHidden: { opacity: 0 },
  title:         { color: C.text, fontSize: 18, fontWeight: '700' },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
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
