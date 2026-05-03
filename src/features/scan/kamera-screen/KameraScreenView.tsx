import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Animated, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useSharedValue, useAnimatedStyle, interpolate,
} from 'react-native-reanimated';
import { useCameraPermissions } from 'expo-camera';
import { useRouter, useFocusEffect } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';

import { useStore } from '@/store';
import { ERROR_COPY } from '@/features/detail/constants/documentStatus';
import { useBatch } from '@/hooks/useBatch';
import { useImagePipeline } from '@/modules/image-processing/hooks/useImagePipeline';
import { useImageSession } from '@/modules/image-processing/hooks/useImageSession';
import { useFilterPreview } from '@/modules/image-processing/hooks/useFilterPreview';
import { getSharedImageSessionManager } from '@/modules/image-processing/session/ImageSessionManager';
import { useOcr } from '@/hooks/useOcr';
import { useDocumentPipeline } from '@/hooks/useDocumentPipeline';
import { useSmartDocumentPipeline } from '@/hooks/useSmartDocumentPipeline';
import { useScanner } from '@/hooks/useScanner';
import { useSheet } from '@/hooks/useSheet';

import { useCameraHandler } from '@/features/scan/hooks/useCameraHandler';
import { useProcessingHandler } from '@/features/scan/hooks/useProcessingHandler';
import { useScanFlowController } from '@/features/scan/hooks/useScanFlowController';
import { useScanEditActions } from '@/features/scan/hooks/useScanEditActions';
import { useScanFilterActions } from '@/features/scan/hooks/useScanFilterActions';
import { useScanSessionSelection } from '@/features/scan/hooks/useScanSessionSelection';
import { ScanProvider } from '@/features/scan/context/ScanContext';
import { SCREEN_H } from '@/features/scan/constants';
import { executeScanAction } from '@/modules/scanner/flow/scanActions';
import { finishScanFlow } from '@/features/scan/kamera-screen/scanNavigate';
import { clearPendingFirstValueNavigation } from '@/product/onboardingStorage';
import KameraScreenBody from '@/features/scan/kamera-screen/KameraScreenBody';
import AutoFillReviewModal from '@/components/auto-fill-review/AutoFillReviewModal';

import type { CameraView as ExpoCameraView } from 'expo-camera';
import type { BatchPage } from '@/modules/batch/types';
import type { PostCaptureAction } from '@/features/scan/components/PostCaptureActionSheet';
import { useKameraScreenEffects } from '@/features/scan/kamera-screen/useKameraScreenEffects';

export default function KameraScreenView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dispatch, state } = useStore();
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
  } = useDocumentPipeline(dispatch, () => state.einstellungen.lernRegeln ?? []);
  const smartPipeline = useSmartDocumentPipeline(dispatch);
  const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });
  const { pages, pageCount, addPage, removePage, movePageUp, movePageDown, rotatePage, updatePage, clearPages, replacePages, attachOcr, attachMetadata, generatePdf } = useBatch();
  const { setCameraRef, isCapturing, stability, lastCapture, capture, updateConfig, distanceHint, detectedEdges, startLiveEdgeDetection, stopLiveEdgeDetection } = useScanner();
  const { config: sheetConfig, showSheet, hideSheet, confirm: confirmSheet } = useSheet();

  const cameraRef = useRef<ExpoCameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = permission?.granted ?? false;

  const flow = useScanFlowController();
  const {
    mode, setMode, autoCapture, toggleAutoCapture,
    showActionPicker, openActionPicker, closeActionPicker,
    flash, toggleFlash, qualityPreset, setQualityPreset,
    editingPageId, startEditing, stopEditing,
    goToBatch, backToCamera,
  } = flow;
  const scanContextValue = useMemo(() => ({
    mode,
    autoCapture,
    toggleAutoCapture,
    flash,
    toggleFlash,
    qualityPreset,
    setQualityPreset,
    showActionPicker,
    openActionPicker,
    closeActionPicker,
  }), [
    mode,
    autoCapture,
    toggleAutoCapture,
    flash,
    toggleFlash,
    qualityPreset,
    setQualityPreset,
    showActionPicker,
    openActionPicker,
    closeActionPicker,
  ]);
  const editSlide   = useRef(new Animated.Value(60)).current;
  const editOpacity = useRef(new Animated.Value(0)).current;

  const [captureFilterId, setCaptureFilterId] = useState('original');
  const { sessionPages, editablePage, targetPage, handleOpenPageEditor } = useScanSessionSelection({
    pages,
    editingPageId,
    loadSession,
    imageSessionManager,
    setActiveFilter,
    mode,
    startEditing,
  });
  const committedFilterId = targetPage?.imageSession?.activeFilter
    ?? targetPage?.filter
    ?? targetPage?.capture?.processing.filter
    ?? captureFilterId;

  const scanLineY = useSharedValue(0);
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
    opacity: interpolate(scanLineY.value, [0, SCREEN_H * 0.3, SCREEN_H * 0.7], [0, 1, 0]),
  }));

  /** Onboarding ohne Beleg wieder verlassen → kein späterer Irrweg zu First‑Value */
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (pageCount === 0 && mode === 'camera') void clearPendingFirstValueNavigation();
      };
    }, [pageCount, mode]),
  );

  useKameraScreenEffects({
    setCameraRef,
    cameraRef,
    autoCapture,
    flash,
    mode,
    qualityPreset,
    captureFilterId,
    updateConfig,
    setCaptureFilterId,
    setActiveFilter,
    lastCapture,
    createFromCapture,
    addPage,
    scanLineY,
    editSlide,
    editOpacity,
    startLiveEdgeDetection,
    stopLiveEdgeDetection,
  });

  const {
    transitionEditMode,
    applyFilterToPage,
    handleFilterChange,
    handleApplyFilter,
    handleToggleFilters,
    handleStartEnhance,
    handleApplyFilterToAll,
  } = useScanFilterActions({
    activeSession,
    resetFilterPreview,
    setEditMode,
    pages,
    imageSessionManager,
    processSession,
    updatePage,
    setActiveFilter,
    activeFilter,
    targetPage,
    setCaptureFilterId,
    loadSession,
    applyFilterPreview,
  });

  const handleRotateAll = useCallback(async () => {
    for (const page of sessionPages) {
      await rotatePage(page.id);
    }
  }, [sessionPages, rotatePage]);

  const {
    isOptimizing,
    compareUri,
    handleStartCrop,
    handleOptimize,
    handleAcceptOptimize,
    handleRevertOptimize,
    handleRotateInEdit,
    handleCloseEdit,
    handleCropConfirm,
    handleCropConfirmAndAnalyze,
    handleCropCancel,
    handleManualAdjust,
  } = useScanEditActions({
    activeSession,
    editablePage,
    editingPageId,
    imageSessionManager,
    updatePage,
    loadSession,
    applyCropResult,
    transitionEditMode,
    rotatePage,
    setFilterPreviewUri,
    stopEditing,
    setMode,
  });

  const { handleCapture, handleClearAll } = useCameraHandler({
    capture, isCapturing, prepareCapture, activeFilter: captureFilterId, showSheet, hideSheet, confirmSheet, clearPages,
  });

  // Saves a minimal needs_review document from supplied page URIs, then navigates to it.
  // Pass optimisticId to UPDATE the existing placeholder instead of creating a new doc.
  const saveAsNeedsReview = useCallback(async (pageUris: Array<{ uri: string }>, optimisticId?: string) => {
    try {
      const saved = await finalizeDocument({ rawText: '', confidence: null, pages: pageUris, optimisticId });
      clearPages();
      setMode('camera');
      void finishScanFlow(router, saved.id);
    } catch {
      if (optimisticId) dispatch({ type: 'DELETE_DOKUMENT', id: optimisticId });
      clearPages();
      setMode('camera');
    }
  }, [finalizeDocument, clearPages, setMode, router, dispatch]);

  // Called by AnalysisView visual-timeout buttons ("Felder prüfen" / "Trotzdem weiter").
  const handleContinueAnyway = useCallback(async () => {
    const ordered  = [...sessionPages].sort((a, b) => a.order - b.order);
    const pageUris = ordered.map(p => ({ uri: p.imageSession?.finalUri ?? p.uri }));
    await saveAsNeedsReview(pageUris);
  }, [sessionPages, saveAsNeedsReview]);

  // Called by useProcessingHandler when OCR yields no usable result.
  const handleNeedsReview = useCallback((pageUris: Array<{ uri: string }>, optimisticId?: string) => {
    showSheet({
      title:   'Bitte kurz prüfen',
      message: ERROR_COPY.ocr_failed,
      icon:    'document-text',
      tone:    'warning',
      actions: [
        { label: 'Felder prüfen', variant: 'primary',   onPress: () => { hideSheet(); void saveAsNeedsReview(pageUris, optimisticId); } },
        { label: 'Neu scannen',   variant: 'secondary', onPress: () => {
          hideSheet();
          Alert.alert(
            'Scan verwerfen?',
            'Der aufgenommene Scan wird gelöscht.',
            [
              { text: 'Behalten',   style: 'cancel' },
              { text: 'Verwerfen',  style: 'destructive', onPress: () => {
                if (optimisticId) dispatch({ type: 'DELETE_DOKUMENT', id: optimisticId });
                clearPages();
                setMode('camera');
              }},
            ],
          );
        }},
      ],
    });
  }, [showSheet, hideSheet, saveAsNeedsReview, clearPages, setMode, dispatch]);

  const { handleProcessAll } = useProcessingHandler({
    pages: sessionPages, recognizeCaptures, attachOcr, finalizeDocument, attachMetadata,
    analyzeAndReview: smartPipeline.analyzeAndReview,
    clearPages, setMode, showSheet, hideSheet,
    onComplete: (savedId) => { void finishScanFlow(router, savedId); },
    dispatchOptimistic,
    onOptimisticFail: (id) => dispatch({ type: 'DELETE_DOKUMENT', id }),
    onNeedsReview: handleNeedsReview,
  });

  const handleActionSelect = useCallback(async (action: PostCaptureAction) => {
    closeActionPicker();
    if (action === 'advanced') {
      setMode('advanced');
      return;
    }
    if (action === 'add_page') {
      backToCamera();
      return;
    }
    if (action === 'edit') {
      const lastPage = [...sessionPages].sort((a, b) => b.order - a.order)[0];
      if (lastPage) startEditing(lastPage.id, mode);
      return;
    }
    const sourceUris = [...sessionPages]
      .sort((a, b) => a.order - b.order)
      .map(p => p.imageSession?.finalUri ?? p.uri)
      .filter(Boolean) as string[];

    await executeScanAction({
      action,
      pageCount,
      sourceUris,
      runDiagnose: handleProcessAll,
      clearPages,
      onCloseFlow: () => {
        setMode('camera');
        safeBack(router);
      },
      onArchived: (dokId) => {
        setMode('camera');
        void finishScanFlow(router, dokId);
      },
      showSheet,
      hideSheet,
      generatePdf,
      dispatch,
    });
  }, [
    closeActionPicker, sessionPages, pageCount, handleProcessAll, clearPages,
    showSheet, hideSheet, generatePdf, router, dispatch, setMode, backToCamera, startEditing, mode,
  ]);

  const onRootLayout = useCallback((width: number, height: number) => {
    setOverlaySize({ w: width, h: height });
  }, []);

  const handleReviewConfirm = useCallback(async (edits: Parameters<typeof smartPipeline.confirmAndSave>[0]) => {
    const saved = await smartPipeline.confirmAndSave(edits);
    if (saved) {
      clearPages();
      void finishScanFlow(router, saved.id);
    }
  }, [smartPipeline, clearPages, router]);

  const handleOpenGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    addPage({
      uri: asset.uri,
      filter: 'none',
      corners: undefined,
      enhanced: false,
      capture: undefined,
      imageSession: undefined,
      ocr: undefined,
      metadata: undefined,
      selected: false,
    });
    goToBatch();
  }, [addPage, goToBatch]);

  return (
    <ScanProvider value={scanContextValue}>
      <AutoFillReviewModal
        visible={smartPipeline.showReview}
        onClose={smartPipeline.dismissReview}
        onBestaetigen={handleReviewConfirm}
        autoFillResult={smartPipeline.autoFillResult}
        categoryResult={smartPipeline.categoryResult}
        isProcessing={smartPipeline.isSaving}
      />
      <KameraScreenBody
        overlaySize={overlaySize}
        onRootLayout={onRootLayout}
        mode={mode}
        stability={stability}
        isCapturing={isCapturing}
        flyingCardUri={flyingCardUri}
        clearFlyingCard={clearFlyingCard}
        cameraRef={cameraRef}
        hasPermission={hasPermission}
        requestPermission={requestPermission}
        onOpenGallery={handleOpenGallery}
        activeFilter={activeFilter}
        committedFilterId={committedFilterId}
        handleFilterChange={handleFilterChange}
        handleApplyFilter={handleApplyFilter}
        handleToggleFilters={handleToggleFilters}
        filterPresets={filterPresets}
        handleCapture={handleCapture}
        pageCount={pageCount}
        sessionPages={sessionPages}
        goToBatch={goToBatch}
        removePage={removePage}
        handleOpenPageEditor={handleOpenPageEditor}
        scanLineStyle={scanLineStyle}
        insets={insets}
        onCloseCamera={() => safeBack(router)}
        distanceHint={distanceHint}
        detectedCorners={detectedEdges}
        backToCamera={backToCamera}
        handleClearAll={handleClearAll}
        movePageUp={movePageUp}
        movePageDown={movePageDown}
        rotatePage={rotatePage}
        handleApplyFilterToAll={handleApplyFilterToAll}
        handleRotateAll={handleRotateAll}
        replacePages={(nextPages) => replacePages(nextPages as BatchPage[])}
        addPage={addPage}
        activeSession={activeSession}
        editablePage={editablePage}
        editOpacity={editOpacity}
        editSlide={editSlide}
        isOptimizing={isOptimizing}
        compareUri={compareUri}
        handleAcceptOptimize={handleAcceptOptimize}
        handleRevertOptimize={handleRevertOptimize}
        handleCloseEdit={handleCloseEdit}
        openActionPicker={openActionPicker}
        handleStartCrop={handleStartCrop}
        handleOptimize={handleOptimize}
        handleRotateInEdit={handleRotateInEdit}
        handleCropConfirm={handleCropConfirm}
        handleCropConfirmAndAnalyze={handleCropConfirmAndAnalyze}
        handleCropCancel={handleCropCancel}
        handleManualAdjust={handleManualAdjust}
        showActionPicker={showActionPicker}
        sheetConfig={sheetConfig}
        hideSheet={hideSheet}
        handleActionSelect={handleActionSelect}
        onStartProcessing={handleProcessAll}
        onAnalysisContinueAnyway={handleContinueAnyway}
        onAnalysisRetry={handleProcessAll}
        onAnalysisCancel={() => { clearPages(); setMode('camera'); }}
      />
    </ScanProvider>
  );
}
