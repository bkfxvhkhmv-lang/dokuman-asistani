import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, AppState, type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import IconButton from '@/components/IconButton';
import { resolveOcrBackend, resetOcrBackendCache } from './domain/ocrBackend';
import { useOcrMvpJob } from '@/hooks/useOcrMvpJob';
import { useStore } from '@/store';
import { generateId } from '@/utils';
import { persistScanFiles } from '@/modules/scanner/storage/scanFileStorage';
import type { ScannedPage } from '@/store';
import { ocrMvpToV4Document } from './adapters/ocrMvpToV4Document';
import { useOfflineBannerSuppression } from '@/contexts/OfflineBannerContext';
import { setPrivacyGateBypassed } from '@/hooks/privacyGateBypass';
import OcrMvpUploadBox from './components/OcrMvpUploadBox';
import OcrMvpStatusCard from './components/OcrMvpStatusCard';
import OcrMvpResultCard from './components/OcrMvpResultCard';
import type { OcrMvpForceType } from '@/services/ocrMvpApi';
import { postAcceptedSnapshot } from '@/services/ocrMvpApi';
import type { OcrMvpErrorKind } from '@/hooks/useOcrMvpJob';
import { useT } from '@/hooks/useT';
import { ExpoScannerProvider } from './scanner/ExpoScannerProvider';
import type { ScannedAsset } from './scanner/types';
import {
  buildDraftDocument,
  findDuplicateImportByFileSize,
  persistImportSource,
} from './domain/saveImportDraft';

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

const OCR_KEEP_AWAKE_TAG = 'briefpilot-ocr-mvp';

export default function OcrMvpScreen({ onClose }: Props) {
  const { Colors } = useTheme();
  const { t: T } = useT();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const { status, jobId, result, error, errorKind, startJob, reset } = useOcrMvpJob();
  const [health, setHealth] = useState<HealthState>('checking');
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedPreviewUri, setSelectedPreviewUri] = useState<string | null>(null);
  const [earlyPersistedDocId, setEarlyPersistedDocId] = useState<string | null>(null);
  const [earlyPersistedPages, setEarlyPersistedPages] = useState<ScannedPage[] | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [saveWithoutAnalysisBusy, setSaveWithoutAnalysisBusy] = useState(false);
  const { setSuppressBanner } = useOfflineBannerSuppression();
  const timingRef = useRef<TimingMarks>({});
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const scannerSessionRef = useRef(false);
  const submissionStartingRef = useRef(false);

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
    const { healthy } = await resolveOcrBackend();
    setHealth(healthy ? 'online' : 'offline');
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  useEffect(() => {
    if ((status === 'error' || status === 'timeout') && error && __DEV__) {
      console.warn('[OcrMvpScreen] Analysefehler (intern, nicht im UI):', error);
    }
  }, [status, error]);

  const persistDraftAndSave = useCallback(async (
    sourceUri: string,
    fileName: string | null,
    opts?: { existingDocId?: string | null; existingPages?: ScannedPage[] | null },
  ): Promise<string> => {
    if (savedDocId) return savedDocId;

    let docId = opts?.existingDocId ?? earlyPersistedDocId;
    let persistedPages = opts?.existingPages ?? earlyPersistedPages;

    if (!docId || !persistedPages?.length) {
      const persisted = await persistImportSource(docId, sourceUri);
      docId = persisted.docId;
      persistedPages = persisted.pages;
      setEarlyPersistedDocId(docId);
      setEarlyPersistedPages(persistedPages);
    }

    const duplicate = await findDuplicateImportByFileSize(state.dokumente, persistedPages);
    if (duplicate) {
      setSavedDocId(duplicate.id);
      return duplicate.id;
    }

    const doc = buildDraftDocument(docId, persistedPages, fileName, sourceUri);
    dispatch({ type: 'ADD_DOKUMENT', payload: doc });
    setSavedDocId(doc.id);
    return doc.id;
  }, [
    savedDocId,
    earlyPersistedDocId,
    earlyPersistedPages,
    state.dokumente,
    dispatch,
  ]);

  const handleSaveWithoutAnalysisFromAsset = useCallback(async (asset: ScannedAsset) => {
    if (saveWithoutAnalysisBusy) return;
    // Same file already saved — just open it.
    if (savedDocId && asset.uri === selectedUri) {
      router.push({ pathname: '/detail', params: { dokId: savedDocId, tab: 'ozet' } });
      return;
    }
    setSaveWithoutAnalysisBusy(true);
    // Replace any previous asset/draft state before persisting the new file.
    setSelectedUri(asset.uri);
    setSelectedFileName(asset.name ?? null);
    setSelectedPreviewUri(asset.previewUri ?? null);
    setSavedDocId(null);
    setEarlyPersistedDocId(null);
    setEarlyPersistedPages(null);
    try {
      // Inline persist — avoids stale-closure issue with persistDraftAndSave.
      const persisted = await persistImportSource(null, asset.uri);
      setEarlyPersistedDocId(persisted.docId);
      setEarlyPersistedPages(persisted.pages);
      const duplicate = await findDuplicateImportByFileSize(state.dokumente, persisted.pages);
      let finalDocId: string;
      if (duplicate) {
        finalDocId = duplicate.id;
      } else {
        const doc = buildDraftDocument(persisted.docId, persisted.pages, asset.name ?? null, asset.uri);
        dispatch({ type: 'ADD_DOKUMENT', payload: doc });
        finalDocId = doc.id;
      }
      setSavedDocId(finalDocId);
      setTiming('saveDone');
      router.push({ pathname: '/detail', params: { dokId: finalDocId, tab: 'ozet' } });
    } catch (e: any) {
      Alert.alert(T('ocr.save.error.title'), e?.message ?? T('ocr.save.error.generic'));
    } finally {
      setSaveWithoutAnalysisBusy(false);
    }
  }, [
    saveWithoutAnalysisBusy,
    savedDocId,
    selectedUri,
    state.dokumente,
    dispatch,
    router,
    T,
    setTiming,
  ]);

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
    setSelectedFileName(fileName ?? null);
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

  useEffect(() => {
    if (status === 'uploading' || status === 'processing') {
      submissionStartingRef.current = false;
    }
  }, [status]);

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
    setSelectedFileName(null);
    setSelectedPreviewUri(null);
    setEarlyPersistedDocId(null);
    setEarlyPersistedPages(null);
    timingRef.current = {};
    reset();
  }, [reset]);

  // Fallback: OCR failed/offline — save imported file as a minimal draft document.
  const handleSaveAsDraft = useCallback(async () => {
    if (savedDocId || !selectedUri) return;
    try {
      const docId = await persistDraftAndSave(selectedUri, selectedFileName);
      setSavedDocId(docId);
    } catch (e: any) {
      Alert.alert(T('ocr.save.error.title'), e?.message ?? T('ocr.save.error.generic'));
    }
  }, [savedDocId, selectedUri, selectedFileName, persistDraftAndSave, T]);

  const runNewAnalysisPick = useCallback(async (pick: () => Promise<ScannedAsset | null>) => {
    scannerSessionRef.current = true;
    submissionStartingRef.current = false;
    setScannerOpen(true);
    try {
      const asset = await pick();
      if (!asset) return;
      submissionStartingRef.current = true;
      handleReset();
      await handleSubmit(
        asset.uri,
        asset.name,
        asset.mimeType,
        undefined,
        asset.previewUri,
        asset.source,
        asset.pageCount,
      );
    } catch (e: any) {
      Alert.alert(T('ocr.upload.scan_error_title'), e?.message ?? T('ocr.upload.scan_error_body'));
    } finally {
      scannerSessionRef.current = false;
      requestAnimationFrame(() => requestAnimationFrame(() => setScannerOpen(false)));
    }
  }, [handleReset, handleSubmit, T]);

  const handleNewAnalysisScan = useCallback(
    () => runNewAnalysisPick(() => ExpoScannerProvider.takePhotoWithScanner()),
    [runNewAnalysisPick],
  );
  const handleNewAnalysisFile = useCallback(
    () => runNewAnalysisPick(() => ExpoScannerProvider.pickFile()),
    [runNewAnalysisPick],
  );
  const handleNewAnalysisPhoto = useCallback(
    () => runNewAnalysisPick(() => ExpoScannerProvider.pickFromLibrary()),
    [runNewAnalysisPick],
  );

  useEffect(() => {
    if (status === 'done' && result) {
      setTiming('resultVisible');
      emitTimingSummary('resultVisible');
    }
  }, [status, result, emitTimingSummary, setTiming]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/inactive|background/) && nextState === 'active') {
        if (scannerSessionRef.current && !submissionStartingRef.current && status !== 'uploading' && status !== 'processing') {
          scannerSessionRef.current = false;
          setScannerOpen(false);
        }
      }
    });
    return () => sub.remove();
  }, [status]);

  useEffect(() => {
    const shouldKeepAwake = scannerOpen || status === 'uploading' || status === 'processing';
    if (!shouldKeepAwake) {
      void deactivateKeepAwake(OCR_KEEP_AWAKE_TAG).catch(() => {});
      return;
    }

    void activateKeepAwakeAsync(OCR_KEEP_AWAKE_TAG).catch((e) => {
      if (__DEV__) {
        console.warn('[OcrMvpScreen] keep-awake activation failed', e);
      }
    });

    return () => {
      void deactivateKeepAwake(OCR_KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [scannerOpen, status]);

  useEffect(() => {
    const suppressPrivacyGate = scannerOpen || status === 'uploading' || status === 'processing';
    setPrivacyGateBypassed(suppressPrivacyGate);
    return () => setPrivacyGateBypassed(false);
  }, [scannerOpen, status]);

  const st = styles(Colors);
  const isActive = status === 'uploading' || status === 'processing';
  const hideIdleChrome = scannerOpen && !isActive;

  return (
    <SafeAreaView style={st.root} edges={['top', 'bottom']}>
      <View style={[st.header, hideIdleChrome && st.headerHidden]} pointerEvents={hideIdleChrome ? 'none' : 'auto'}>
        <Text style={st.title}>{T('ocr.upload.screen_title')}</Text>
        {onClose && (
          <IconButton onPress={onClose} accessibilityLabel={T('common.close')}>
            <Icon name="close" size={22} color={Colors.textSecondary} />
          </IconButton>
        )}
      </View>

      {/* Analiz sırasında tam ekran ortalı state — ScrollView değil */}
      {(status === 'uploading' || status === 'processing') && (
        <View style={st.centeredState}>
          <OcrMvpStatusCard status={status} previewUri={selectedPreviewUri ?? undefined} />
          <TouchableOpacity style={st.cancelAnalysisBtn} onPress={handleReset} activeOpacity={0.8}>
            <Text style={st.cancelAnalysisLabel}>{T('ocr.status.cancel_analysis')}</Text>
          </TouchableOpacity>
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
            onPickScan={handleNewAnalysisScan}
            onPickFile={handleNewAnalysisFile}
            onPickPhoto={handleNewAnalysisPhoto}
            entryBusy={scannerOpen}
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
              {(earlyPersistedDocId || selectedUri) && !savedDocId && (
                <TouchableOpacity style={st.draftBtn} onPress={handleSaveAsDraft} activeOpacity={0.8}>
                  <Text style={st.draftLabel}>{T('ocr.upload.save_without_analysis')}</Text>
                </TouchableOpacity>
              )}
              {savedDocId && (
                <TouchableOpacity style={st.draftBtn} onPress={handleOpenDocument} activeOpacity={0.8}>
                  <Text style={st.draftLabel}>{T('ocr.upload.open_document')}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {/* Idle durumda: health check + upload box — done state'de gizle */}
        {!isActive && status !== 'done' && (
          <View style={hideIdleChrome ? st.idleChromeHidden : undefined} pointerEvents={hideIdleChrome ? 'none' : 'auto'}>
            {health === 'checking' && (
              <View style={st.checkingBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={[st.checkingLabel, { color: Colors.textSecondary }]}>
                  {T('ocr.preparing')}
                </Text>
              </View>
            )}

            {health === 'offline' && status !== 'error' && status !== 'timeout' && (
              <View style={st.errorCard}>
                <Icon name="cloud-offline-outline" size={24} color="#F59E0B" />
                <Text style={st.errorTitle}>{T('ocr.upload.offline_title')}</Text>
                <Text style={st.errorMsg}>{T('ocr.upload.offline_body')}</Text>
                <TouchableOpacity style={st.retryBtn} onPress={() => { resetOcrBackendCache(); checkHealth(); }} activeOpacity={0.8}>
                  <Text style={st.retryLabel}>{T('ocr.error.cta.retry')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <OcrMvpUploadBox
              onSubmit={handleSubmit}
              onSaveWithoutAnalysis={handleSaveWithoutAnalysisFromAsset}
              saveWithoutAnalysisBusy={saveWithoutAnalysisBusy}
              onScannerPresentingChange={setScannerOpen}
            />
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
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  cancelAnalysisBtn: {
    marginTop: 18,
    minWidth: 220,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgCard,
    alignItems: 'center',
  },
  cancelAnalysisLabel: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
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
  draftBtn:      {
    marginTop: 6, paddingVertical: 10, paddingHorizontal: 28,
    backgroundColor: 'transparent', borderRadius: 12,
    borderWidth: 1, borderColor: C.primary + '50',
  },
  draftLabel:    { color: C.primary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
