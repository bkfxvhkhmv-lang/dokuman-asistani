import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StatusBar, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate,
} from 'react-native-reanimated';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';

import { useStore } from '../../store';
import { useBatch } from '../../hooks/useBatch';
import { useImagePipeline } from '../../modules/image-processing/hooks/useImagePipeline';
import { optimizeDocumentImage } from '../../modules/image-processing/engine/SkiaDocumentOptimizer';
import { useImageSession } from '../../modules/image-processing/hooks/useImageSession';
import { useFilterPreview } from '../../modules/image-processing/hooks/useFilterPreview';
import { getSharedImageSessionManager } from '../../modules/image-processing/session/ImageSessionManager';
import { useOcr } from '../../hooks/useOcr';
import { useDocumentPipeline } from '../../hooks/useDocumentPipeline';
import { useScanner } from '../../hooks/useScanner';
import { useSheet } from '../../hooks/useSheet';
import AppBottomSheet from '../../components/AppBottomSheet';

import CameraView from './components/CameraView';
import BatchView from './components/BatchView';
import EditView from './components/EditView';
import AnalysisView from './components/AnalysisView';
import QuickScanOverlay from './components/QuickScanOverlay';
import FlyingCard from '../../components/FlyingCard';
import PostCaptureActionSheet, { type PostCaptureAction } from './components/PostCaptureActionSheet';
import { useCameraHandler } from './hooks/useCameraHandler';
import { useProcessingHandler } from './hooks/useProcessingHandler';
import { styles } from './styles';
import { SCREEN_H } from './constants';
import { deriveEditUiState, resolveEditTransition, type EditTransitionEvent } from './state/EditStateMachine';

import type { CameraView as ExpoCameraView } from 'expo-camera';
import type { BatchPage } from '../../modules/batch/types';

type Mode = 'camera' | 'edit' | 'batch' | 'processing';
type SessionBatchPage = BatchPage & { imageSession: NonNullable<BatchPage['imageSession']> };

export default function KameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dispatch } = useStore();
  const imageSessionManager = getSharedImageSessionManager();

  const { prepareCapture, processSession } = useImagePipeline();
  const {
    session: activeSession,
    loadSession,
    createFromCapture,
    setEditMode,
    applyCropResult,
  } = useImageSession();
  const {
    presets: filterPresets,
    activeId: activeFilter,
    setActiveId: setActiveFilter,
    processing: isFilterPreviewProcessing,
    previewUri: filterPreviewUri,
    setPreviewUri: setFilterPreviewUri,
    applyFilter: applyFilterPreview,
    reset: resetFilterPreview,
  } = useFilterPreview();
  const { recognizeBatch: recognizeCaptures } = useOcr();
  const {
    finalizeDocument, dispatchOptimistic, flyingCardUri, clearFlyingCard,
  } = useDocumentPipeline(dispatch);
  const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });
  const { pages, pageCount, addPage, removePage, movePageUp, movePageDown, rotatePage, updatePage, clearPages, attachOcr, attachMetadata, generatePdf, isGeneratingPdf } = useBatch();
  const { setCameraRef, isCapturing, stability, lastCapture, capture, updateConfig, distanceHint } = useScanner();
  const { config: sheetConfig, showSheet, hideSheet, confirm: confirmSheet } = useSheet();

  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = permission?.granted ?? false;

  const [mode, setMode] = useState<Mode>('camera');
  const [autoCapture, setAutoCapture] = useState(false);
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [compareUri, setCompareUri] = useState<string | null>(null);

  // Screen transition: slide-up for edit, fade for processing
  const editSlide   = useRef(new Animated.Value(60)).current;
  const editOpacity = useRef(new Animated.Value(0)).current;
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [captureFilterId, setCaptureFilterId] = useState('original');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editReturnMode, setEditReturnMode] = useState<'camera' | 'batch'>('camera');
  const lastHandledCapture = useRef<number | null>(null);
  const sessionPages = pages.filter((page): page is SessionBatchPage => !!page.imageSession);
  const editablePage = sessionPages.find(page => page.id === editingPageId) ?? null;
  const latestPage = sessionPages.length > 0 ? sessionPages[sessionPages.length - 1] : null;
  const targetPage = editablePage ?? latestPage;
  const editUiState = deriveEditUiState(activeSession?.editMode ?? 'none');
  const committedFilterId = targetPage?.imageSession?.activeFilter
    ?? targetPage?.filter
    ?? targetPage?.capture?.processing.filter
    ?? captureFilterId;

  const scanLineY = useSharedValue(0);
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
    opacity: interpolate(scanLineY.value, [0, SCREEN_H * 0.3, SCREEN_H * 0.7], [0, 1, 0]),
  }));

  useEffect(() => { setCameraRef(cameraRef as React.RefObject<ExpoCameraView>); }, [setCameraRef]);

  useEffect(() => {
    updateConfig({
      autoCapture: autoCapture && mode === 'camera',
      flash, exposure: 0, filter: captureFilterId,
      enableEdgeDetection: autoCapture,
      enablePerspectiveCorrection: true,
    });
  }, [autoCapture, captureFilterId, flash, mode, updateConfig]);

  useEffect(() => {
    scanLineY.value = (mode === 'camera' && autoCapture)
      ? withRepeat(withTiming(SCREEN_H * 0.7, { duration: 2000 }), -1, true)
      : 0;
  }, [mode, autoCapture, scanLineY]);

  useEffect(() => {
    if (!targetPage) {
      loadSession(null);
      return;
    }

    const nextSession = targetPage.imageSession
      ?? (targetPage.capture ? imageSessionManager.fromCapture(targetPage.capture) : imageSessionManager.create(targetPage.uri, targetPage.filter ?? 'original'));
    loadSession(nextSession);
  }, [imageSessionManager, loadSession, targetPage]);

  useEffect(() => {
    if (!lastCapture || lastHandledCapture.current === lastCapture.timestamp) return;
    lastHandledCapture.current = lastCapture.timestamp;
    const imageSession = createFromCapture(lastCapture);
    addPage({
      uri: lastCapture.finalUri,
      filter: lastCapture.processing.filter,
      enhanced: lastCapture.processing.enhancementApplied,
      capture: lastCapture,
      imageSession,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [addPage, createFromCapture, lastCapture]);

  // ── Stable callbacks — must be at top level, NOT inside JSX ────────────────
  const handleToggleFlash        = useCallback(() => setFlash(f => f === 'off' ? 'on' : 'off'), []);
  const handleToggleAutoCapture  = useCallback(() => setAutoCapture(a => !a), []);
  const handleGoToBatch          = useCallback(() => setMode('batch'), []);
  const handleBackToCamera       = useCallback(() => setMode('camera'), []);

  const transitionEditMode = useCallback((event: EditTransitionEvent) => {
    if (!activeSession) return resolveEditTransition('none', event);

    const transition = resolveEditTransition(activeSession.editMode ?? 'none', event);
    if (!transition.allowed) return transition;

    if (transition.exiting.some(modeName => modeName === 'filter-preview' || modeName === 'enhance')
      && transition.nextMode !== 'filter-preview'
      && transition.nextMode !== 'enhance') {
      resetFilterPreview(activeSession);
    }

    setEditMode(transition.nextMode);
    return transition;
  }, [activeSession, resetFilterPreview, setEditMode]);

  const applyFilterToPage = useCallback(async (pageId: string, filterId: string) => {
    const page = pages.find(currentPage => currentPage.id === pageId);
    if (!page) return;

    const baseSession = activeSession
      ?? page.imageSession
      ?? (page.capture ? imageSessionManager.fromCapture(page.capture) : imageSessionManager.create(page.uri, page.filter ?? 'original'));
    const processed = await processSession(baseSession, { filter: filterId, mode: 'final' });
    updatePage(pageId, {
      uri: processed.session.finalUri,
      filter: filterId,
      enhanced: processed.applied,
      imageSession: processed.session,
      capture: page.capture ? {
        ...page.capture,
        uri: processed.session.finalUri,
        enhancedUri: processed.applied ? processed.session.finalUri : page.capture.enhancedUri,
        finalUri: processed.session.finalUri,
        filterApplied: processed.applied ? filterId : undefined,
        qualityMetrics: processed.quality ?? page.capture.qualityMetrics,
        processing: {
          ...page.capture.processing,
          filter: filterId,
          enhancementApplied: processed.applied,
          qualityAnalyzed: !!processed.quality,
        },
      } : page.capture,
    });

    return processed.session;
  }, [activeSession, imageSessionManager, pages, processSession, updatePage]);

  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilter(filterId);
  }, [setActiveFilter]);

  const handleApplyFilter = useCallback(async () => {
    if (!targetPage) {
      setCaptureFilterId(activeFilter);
      return;
    }

    const startTransition = transitionEditMode('begin-filter-commit');
    const committedSession = await applyFilterToPage(targetPage.id, activeFilter);
    const finishTransition = startTransition.allowed ? resolveEditTransition(startTransition.nextMode, 'finish-filter-commit') : null;

    if (committedSession && finishTransition?.allowed) {
      loadSession(imageSessionManager.setEditMode(committedSession, finishTransition.nextMode));
      return;
    }

    if (committedSession) {
      loadSession(committedSession);
    }
  }, [activeFilter, applyFilterToPage, imageSessionManager, loadSession, targetPage, transitionEditMode]);

  const handleToggleFilters = useCallback(() => {
    transitionEditMode('toggle-filter-preview');
  }, [transitionEditMode]);

  const handleStartEnhance = useCallback(() => {
    if (!activeSession) return;

    const nextFilter = activeFilter === 'original' ? 'clean' : activeFilter;
    setActiveFilter(nextFilter);
    transitionEditMode('start-enhance');
    void applyFilterPreview(activeSession, nextFilter);
  }, [activeFilter, activeSession, applyFilterPreview, setActiveFilter, transitionEditMode]);

  // Animate in when entering edit mode
  useEffect(() => {
    if (mode === 'edit') {
      editSlide.setValue(60);
      editOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(editSlide,   { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 260 }),
        Animated.timing(editOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [mode]);

  const handleOpenPageEditor = useCallback((pageId: string) => {
    const page = pages.find(currentPage => currentPage.id === pageId);
    if (page) {
      const nextSession = page.imageSession
        ?? (page.capture ? imageSessionManager.fromCapture(page.capture) : imageSessionManager.create(page.uri, page.filter ?? 'original'));
      const nextFilter =
        nextSession.activeFilter
        ?? page.filter
        ?? page.capture?.processing.filter
        ?? 'original';
      const openedSession = imageSessionManager.setEditMode(nextSession, resolveEditTransition(nextSession.editMode ?? 'none', 'open-editor').nextMode);
      loadSession(openedSession);
      setActiveFilter(nextFilter);
    }
    setEditingPageId(pageId);
    setEditReturnMode(mode === 'batch' ? 'batch' : 'camera');
    setMode('edit');
  }, [imageSessionManager, loadSession, mode, pages, setActiveFilter]);

  const handleStartCrop = useCallback(() => {
    transitionEditMode('start-crop');
  }, [transitionEditMode]);

  const handleOptimize = useCallback(async () => {
    if (!editablePage || !activeSession || isOptimizing) return;
    setIsOptimizing(true);
    try {
      const sourceUri = activeSession.finalUri
        ?? activeSession.croppedUri
        ?? activeSession.correctedUri
        ?? activeSession.originalUri;
      if (!sourceUri) return;

      const optimizedUri = await optimizeDocumentImage(sourceUri);
      const updatedSession = imageSessionManager.commitFilter(activeSession, 'clean', optimizedUri);
      updatePage(editablePage.id, {
        uri: optimizedUri,
        filter: 'clean',
        enhanced: true,
        imageSession: updatedSession,
        capture: editablePage.capture ? {
          ...editablePage.capture,
          uri: optimizedUri,
          finalUri: optimizedUri,
          enhancedUri: optimizedUri,
          filterApplied: 'clean',
          processing: {
            ...editablePage.capture.processing,
            filter: 'clean',
            enhancementApplied: true,
          },
        } : editablePage.capture,
      });
      loadSession(updatedSession);
      setCompareUri(sourceUri); // show before/after comparison
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('[KameraScreen] handleOptimize error', e);
    } finally {
      setIsOptimizing(false);
    }
  }, [activeSession, editablePage, imageSessionManager, isOptimizing, loadSession, updatePage]);

  const handleAcceptOptimize = useCallback(() => {
    setCompareUri(null);
  }, []);

  const handleRevertOptimize = useCallback(() => {
    if (!compareUri || !editablePage || !activeSession) { setCompareUri(null); return; }
    const revertedSession = imageSessionManager.commitFilter(activeSession, 'original', compareUri);
    updatePage(editablePage.id, {
      uri: compareUri,
      filter: 'original',
      enhanced: false,
      imageSession: revertedSession,
      capture: editablePage.capture ? {
        ...editablePage.capture,
        uri: compareUri,
        finalUri: compareUri,
        enhancedUri: undefined,
        filterApplied: undefined,
        processing: {
          ...editablePage.capture.processing,
          filter: 'original',
          enhancementApplied: false,
        },
      } : editablePage.capture,
    });
    loadSession(revertedSession);
    setCompareUri(null);
  }, [activeSession, compareUri, editablePage, imageSessionManager, loadSession, updatePage]);

  const handleRotateInEdit = useCallback(async () => {
    if (!editingPageId) return;
    // Clear stale filter preview so the rotated image shows immediately
    setFilterPreviewUri(null);
    const startTransition = transitionEditMode('start-rotate');
    await rotatePage(editingPageId);
    if (startTransition.allowed) {
      transitionEditMode('finish-rotate');
    }
  }, [editingPageId, rotatePage, setFilterPreviewUri, transitionEditMode]);

  const handleCloseEdit = useCallback(() => {
    transitionEditMode('close-editor');
    setEditingPageId(null);
    setCompareUri(null);
    setMode(editReturnMode);
  }, [editReturnMode, transitionEditMode]);

  const handleApplyFilterToAll = useCallback(async (filterId: string) => {
    for (const page of sessionPages) {
      await applyFilterToPage(page.id, filterId);
    }
  }, [sessionPages, applyFilterToPage]);

  const handleRotateAll = useCallback(async () => {
    for (const page of sessionPages) {
      await rotatePage(page.id);
    }
  }, [sessionPages, rotatePage]);

  const handleExportPdf = useCallback(async () => {
    if (sessionPages.length === 0 || isGeneratingPdf) return;
    showSheet({
      title: 'PDF wird erstellt…',
      message: `${sessionPages.length} Seite${sessionPages.length > 1 ? 'n' : ''} werden verarbeitet`,
      icon: 'document',
      tone: 'default',
      actions: [],
    });
    const result = await generatePdf();
    hideSheet();
    if (!result) {
      showSheet({
        title: 'Fehler',
        message: 'PDF konnte nicht erstellt werden.',
        icon: 'alert-circle',
        tone: 'danger',
        actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }],
      });
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'PDF teilen' });
    } else {
      showSheet({
        title: 'PDF gespeichert',
        message: `${result.pageCount} Seiten · ${Math.round(result.fileSize / 1024)} KB`,
        icon: 'checkmark-circle',
        tone: 'success',
        actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }],
      });
    }
  }, [sessionPages, isGeneratingPdf, generatePdf, showSheet, hideSheet]);

  const { handleCapture, handleClearAll } = useCameraHandler({
    capture, isCapturing, prepareCapture, activeFilter: captureFilterId, showSheet, hideSheet, confirmSheet, clearPages,
  });

  const { handleProcessAll } = useProcessingHandler({
    pages: sessionPages, recognizeCaptures, attachOcr, finalizeDocument, attachMetadata,
    clearPages, setMode, showSheet, hideSheet,
    onComplete: (savedId) => {
      if (savedId) {
        router.replace({ pathname: '/detail', params: { dokId: savedId } });
      } else {
        router.back();
      }
    },
    dispatchOptimistic,
    onOptimisticFail: (id) => dispatch({ type: 'DELETE_DOKUMENT', id }),
  });

  const handleActionSelect = useCallback(async (action: PostCaptureAction) => {
    setShowActionPicker(false);

    // All analysis-first actions run the full processing pipeline
    if (action === 'brief' || action === 'analyse' || action === 'autofill' || action === 'risk' || action === 'timeline') {
      handleProcessAll();
      return;
    }

    if (action === 'edit') {
      return;
    }

    if (action === 'archive' || action === 'save_only') {
      showSheet({
        title: 'Gespeichert',
        message: `${sessionPages.length} Seite${sessionPages.length > 1 ? 'n' : ''} im Archiv gesichert.`,
        icon: 'checkmark-circle',
        tone: 'success',
        actions: [{ label: 'OK', variant: 'primary', onPress: () => { hideSheet(); clearPages(); setMode('camera'); router.back(); } }],
      });
      return;
    }

    // export, pdf_share and email all need a PDF first
    showSheet({
      title: 'PDF wird erstellt…',
      message: `${sessionPages.length} Seite${sessionPages.length > 1 ? 'n' : ''} werden verarbeitet`,
      icon: 'document',
      tone: 'default',
      actions: [],
    });
    const pdfResult = await generatePdf();
    hideSheet();

    if (!pdfResult) {
      showSheet({
        title: 'Fehler',
        message: 'PDF konnte nicht erstellt werden.',
        icon: 'alert-circle',
        tone: 'danger',
        actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }],
      });
      return;
    }

    if (action === 'export' || action === 'pdf_share') {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(pdfResult.uri, { mimeType: 'application/pdf', dialogTitle: 'PDF teilen' });
      }
      return;
    }

    if (action === 'email') {
      const available = await MailComposer.isAvailableAsync();
      if (available) {
        await MailComposer.composeAsync({
          subject: 'Dokument (BriefPilot)',
          body: 'Anbei das gescannte Dokument.',
          attachments: [pdfResult.uri],
        });
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(pdfResult.uri, { mimeType: 'application/pdf', dialogTitle: 'PDF senden' });
        }
      }
    }
  }, [sessionPages, generatePdf, handleProcessAll, showSheet, hideSheet, clearPages, router]);

  return (
    <View
      style={styles.fill}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setOverlaySize({ w: width, h: height });
      }}
    >
      <StatusBar barStyle="light-content" />

      {/* Scan overlay — shows when camera is active */}
      {mode === 'camera' && overlaySize.w > 0 && (
        <QuickScanOverlay
          isStable={stability?.isStable ?? false}
          isCapturing={isCapturing}
          width={overlaySize.w}
          height={overlaySize.h}
        />
      )}

      {/* Flying card — after document saved */}
      {flyingCardUri && (
        <FlyingCard uri={flyingCardUri} onComplete={clearFlyingCard} />
      )}

      {mode === 'camera' && (
        <CameraView
          cameraRef={cameraRef as React.RefObject<ExpoCameraView>}
          hasPermission={hasPermission}
          onRequestPermission={requestPermission}
          flash={flash}
          onToggleFlash={handleToggleFlash}
          autoCapture={autoCapture}
          onToggleAutoCapture={handleToggleAutoCapture}
          stability={stability}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          isFilterDirty={activeFilter !== committedFilterId}
          onApplyFilter={handleApplyFilter}
          showFilters={false}
          onToggleFilters={handleToggleFilters}
          filterPresets={filterPresets}
          filterPreviewUri={null}
          isCapturing={isCapturing}
          onCapture={handleCapture}
          pageCount={pageCount}
          pages={sessionPages}
          onBatchPress={handleGoToBatch}
          onRemovePage={removePage}
          onOpenPageEditor={handleOpenPageEditor}
          scanLineStyle={scanLineStyle}
          insets={insets}
          onClose={() => router.back()}
          distanceHint={distanceHint}
        />
      )}

      {mode === 'batch' && (
        <BatchView
          pages={sessionPages}
          pageCount={pageCount}
          filterPresets={filterPresets}
          onBack={handleBackToCamera}
          onClearAll={handleClearAll}
          onOpenPageEditor={handleOpenPageEditor}
          onMoveUp={movePageUp}
          onMoveDown={movePageDown}
          onRotate={rotatePage}
          onRemove={removePage}
          onProcessAll={handleProcessAll}
          onApplyFilterToAll={handleApplyFilterToAll}
          onRotateAll={handleRotateAll}
          onExportPdf={handleExportPdf}
          isGeneratingPdf={isGeneratingPdf}
          onShowActionPicker={() => setShowActionPicker(true)}
        />
      )}

      {mode === 'edit' && activeSession && editablePage && (
        <Animated.View style={{ flex: 1, opacity: editOpacity, transform: [{ translateY: editSlide }] }}>
          <EditView
            session={activeSession}
            isOptimizing={isOptimizing}
            compareUri={compareUri}
            onAcceptOptimize={handleAcceptOptimize}
            onRevertOptimize={handleRevertOptimize}
            onBack={handleCloseEdit}
            onDone={() => { handleCloseEdit(); setShowActionPicker(true); }}
            onStartCrop={handleStartCrop}
            onOptimize={handleOptimize}
            onRotate={handleRotateInEdit}
            onCropConfirm={(croppedUri) => {
              const nextSession = editablePage.imageSession
                ? imageSessionManager.applyCrop(editablePage.imageSession, croppedUri)
                : editablePage.imageSession;
              updatePage(editablePage.id, {
                uri: croppedUri,
                imageSession: nextSession,
                capture: editablePage.capture ? {
                  ...editablePage.capture,
                  finalUri: croppedUri,
                } : editablePage.capture,
              });
              if (activeSession) {
                applyCropResult(croppedUri);
                transitionEditMode('cancel-crop');
              }
            }}
            onCropConfirmAndAnalyze={(croppedUri) => {
              const nextSession = editablePage.imageSession
                ? imageSessionManager.applyCrop(editablePage.imageSession, croppedUri)
                : editablePage.imageSession;
              updatePage(editablePage.id, {
                uri: croppedUri,
                imageSession: nextSession,
                capture: editablePage.capture ? {
                  ...editablePage.capture,
                  finalUri: croppedUri,
                } : editablePage.capture,
              });
              if (activeSession) {
                applyCropResult(croppedUri);
                transitionEditMode('cancel-crop');
              }
              setMode('batch');
            }}
            onCropCancel={() => transitionEditMode('cancel-crop')}
          />
        </Animated.View>
      )}

      {mode === 'processing' && <AnalysisView pageCount={pageCount} />}

      {/* Solid overlay when action sheet is open — prevents camera bleed-through behind modal */}
      {showActionPicker && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D1117' }]} />
      )}

      <AppBottomSheet
        visible={!!sheetConfig}
        onClose={hideSheet}
        title={sheetConfig?.title ?? ''}
        message={sheetConfig?.message}
        icon={sheetConfig?.icon ?? 'information-circle'}
        tone={sheetConfig?.tone ?? 'default'}
        actions={sheetConfig?.actions ?? [{ label: 'OK', variant: 'primary', onPress: hideSheet }]}
      />

      <PostCaptureActionSheet
        visible={showActionPicker}
        pageCount={pageCount}
        onSelect={handleActionSelect}
        onClose={() => setShowActionPicker(false)}
      />

    </View>
  );
}
