import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useSharedValue, useAnimatedStyle, interpolate,
} from 'react-native-reanimated';
import { useCameraPermissions } from 'expo-camera';
import { useRouter, useFocusEffect } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';

import { useStore } from '@/store';
import { useBatch } from '@/hooks/useBatch';
import { useImagePipeline } from '@/modules/image-processing/hooks/useImagePipeline';
import { useImageSession } from '@/modules/image-processing/hooks/useImageSession';
import { useFilterPreview } from '@/modules/image-processing/hooks/useFilterPreview';
import { getSharedImageSessionManager } from '@/modules/image-processing/session/ImageSessionManager';
import { useOcr } from '@/hooks/useOcr';
import { useDocumentPipeline } from '@/hooks/useDocumentPipeline';
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
  const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });
  const { pages, pageCount, addPage, removePage, movePageUp, movePageDown, rotatePage, updatePage, clearPages, replacePages, attachOcr, attachMetadata, generatePdf } = useBatch();
  const { setCameraRef, isCapturing, stability, lastCapture, capture, updateConfig, distanceHint, detectedEdges } = useScanner();
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

  const { handleProcessAll } = useProcessingHandler({
    pages: sessionPages, recognizeCaptures, attachOcr, finalizeDocument, attachMetadata,
    clearPages, setMode, showSheet, hideSheet,
    onComplete: (savedId) => { void finishScanFlow(router, savedId); },
    dispatchOptimistic,
    onOptimisticFail: (id) => dispatch({ type: 'DELETE_DOKUMENT', id }),
  });

  const handleActionSelect = useCallback(async (action: PostCaptureAction) => {
    closeActionPicker();
    if (action === 'advanced') {
      setMode('advanced');
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
    showSheet, hideSheet, generatePdf, router, dispatch, setMode,
  ]);

  const onRootLayout = useCallback((width: number, height: number) => {
    setOverlaySize({ w: width, h: height });
  }, []);

  return (
    <ScanProvider value={scanContextValue}>
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
      />
    </ScanProvider>
  );
}
