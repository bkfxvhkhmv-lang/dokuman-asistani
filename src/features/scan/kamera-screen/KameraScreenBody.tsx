/**
 * KameraScreenBody — görünüm bileşeni: `KameraScreenView` içindeki hook/state
 * yönetimi dışında kalan JSX burada tutulur.
 */
import React from 'react';
import { View, StatusBar, Animated, StyleSheet } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import type { DistanceHint } from '@/hooks/useScanner';
import type { DocumentCorners } from '@/modules/scanner/types';
import type { StabilityState } from '@/features/scan/components/camera-view/types';
import type { ManualAdjustValues } from '@/modules/image-processing/engine/SkiaManualAdjuster.values';
import AppBottomSheet from '@/components/AppBottomSheet';
import FlyingCard from '@/components/FlyingCard';
import CameraView from '@/features/scan/components/CameraView';
import BatchView from '@/features/scan/components/BatchView';
import AdvancedBatchView from '@/features/scan/components/AdvancedBatchView';
import EditView from '@/features/scan/components/EditView';
import AnalysisView from '@/features/scan/components/AnalysisView';
import PostCaptureActionSheet, { type PostCaptureAction } from '@/features/scan/components/PostCaptureActionSheet';
import { styles } from '@/features/scan/styles';
import type { SheetConfig } from '@/hooks/useSheet';
import type { ScanMode } from '@/features/scan/hooks/useScanFlowController';
import type { CameraView as ExpoCameraView } from 'expo-camera';
import type { BatchPage } from '@/modules/batch/types';
import type { CaptureResult } from '@/modules/scanner/types';
import type { OcrResult } from '@/modules/ocr/types';
import type { ImageSession } from '@/modules/image-processing/types';
import type { BatchPageData, FilterPreset } from '@/features/scan/components/batch/types';
import type { AdvancedBatchPageData } from '@/features/scan/components/advanced-batch/types';

export type KameraScreenBodyProps = {
  overlaySize: { w: number; h: number };
  onRootLayout: (width: number, height: number) => void;
  mode: ScanMode;
  stability: StabilityState;
  isCapturing: boolean;
  flyingCardUri: string | null;
  clearFlyingCard: () => void;
  cameraRef: React.RefObject<ExpoCameraView | null>;
  hasPermission: boolean;
  requestPermission: () => void | Promise<unknown>;
  onOpenGallery?: () => void;
  activeFilter: string;
  committedFilterId: string;
  handleFilterChange: (id: string) => void;
  handleApplyFilter: () => void;
  handleToggleFilters: () => void;
  filterPresets: FilterPreset[];
  handleCapture: () => void;
  pageCount: number;
  sessionPages: BatchPage[];
  goToBatch: () => void;
  removePage: (id: string) => void;
  handleOpenPageEditor: (id: string) => void;
  scanLineStyle: AnimatedStyle<ViewStyle>;
  insets: EdgeInsets;
  onCloseCamera: () => void;
  distanceHint: DistanceHint;
  detectedCorners?: DocumentCorners | null;
  edgesAreFresh?: boolean;
  backToCamera: () => void;
  handleClearAll: () => void;
  movePageUp: (id: string) => void;
  movePageDown: (id: string) => void;
  rotatePage: (id: string) => void;
  handleApplyFilterToAll: (pages: BatchPage[], filterId: string) => void;
  handleRotateAll: () => void;
  replacePages: (pages: BatchPage[]) => void;
  addPage: (page: {
    uri: string;
    filter: string;
    corners: BatchPage['corners'];
    enhanced: boolean | undefined;
    capture: CaptureResult | undefined;
    imageSession: ImageSession | undefined;
    ocr: OcrResult | undefined;
    metadata: BatchPage['metadata'];
    selected: boolean;
  }) => void;
  activeSession: ImageSession | null;
  editablePage: BatchPage | null | undefined;
  editOpacity: Animated.Value;
  editSlide: Animated.Value;
  isOptimizing: boolean;
  compareUri: string | null | undefined;
  handleAcceptOptimize: () => void;
  handleRevertOptimize: () => void;
  handleCloseEdit: () => void;
  openActionPicker: () => void;
  handleStartCrop: () => void;
  handleOptimize: () => void;
  handleRotateInEdit: () => void;
  handleCropConfirm: (croppedUri: string) => void;
  handleCropConfirmAndAnalyze: (croppedUri: string) => void;
  handleCropCancel: () => void;
  handleManualAdjust?: (committedUri: string, values: ManualAdjustValues) => void;
  showActionPicker: boolean;
  sheetConfig: SheetConfig | null;
  hideSheet: () => void;
  handleActionSelect: (action: PostCaptureAction) => void;
  onAnalysisContinueAnyway?: () => void;
  onAnalysisCancel?: () => void;
  onAnalysisRetry?: () => void;
  /** Called by EditView "Weiter" — skips PostCaptureActionSheet and starts OCR directly. */
  onStartProcessing: () => void;
  autoCaptureReadiness?: import('@/modules/scanner/types').AutoCaptureReadiness;
  lastCaptureSource?: 'manual' | 'auto';
};

export default function KameraScreenBody(props: KameraScreenBodyProps) {
  const {
    overlaySize, onRootLayout,
    mode, stability, isCapturing, flyingCardUri, clearFlyingCard,
    cameraRef, hasPermission, requestPermission, onOpenGallery,
    activeFilter, committedFilterId, handleFilterChange, handleApplyFilter, handleToggleFilters,
    filterPresets, handleCapture, pageCount, sessionPages, goToBatch, removePage, handleOpenPageEditor,
    scanLineStyle, insets, onCloseCamera, distanceHint, detectedCorners,
    backToCamera, handleClearAll, movePageUp, movePageDown, rotatePage, edgesAreFresh,
    handleApplyFilterToAll, handleRotateAll, replacePages, addPage,
    activeSession, editablePage, editOpacity, editSlide,
    isOptimizing, compareUri, handleAcceptOptimize, handleRevertOptimize,
    handleCloseEdit, openActionPicker,
    handleStartCrop, handleOptimize, handleRotateInEdit,
    handleCropConfirm, handleCropConfirmAndAnalyze, handleCropCancel, handleManualAdjust,
    showActionPicker,
    sheetConfig, hideSheet,
    handleActionSelect,
    onAnalysisContinueAnyway,
    onAnalysisCancel,
    onAnalysisRetry,
    onStartProcessing,
    autoCaptureReadiness,
    lastCaptureSource,
  } = props;

  return (
    <View style={styles.fill} onLayout={e => {
      const { width, height } = e.nativeEvent.layout;
      onRootLayout(width, height);
    }}
    >
      <StatusBar barStyle="light-content" />

      {flyingCardUri ? (
        <FlyingCard uri={flyingCardUri} onComplete={clearFlyingCard} />
      ) : null}

      {mode === 'camera' ? (
        <CameraView
          cameraRef={cameraRef as React.RefObject<ExpoCameraView>}
          hasPermission={hasPermission}
          onRequestPermission={requestPermission}
          onOpenGallery={onOpenGallery}
          stability={stability}
          isCapturing={isCapturing}
          onCapture={handleCapture}
          pageCount={pageCount}
          pages={sessionPages}
          onBatchPress={goToBatch}
          onRemovePage={removePage}
          onOpenPageEditor={handleOpenPageEditor}
          insets={insets}
          onClose={onCloseCamera}
          detectedCorners={detectedCorners}
          edgesAreFresh={edgesAreFresh}
          distanceHint={distanceHint}
          autoCaptureReadiness={autoCaptureReadiness}
          lastCaptureSource={lastCaptureSource}
        />
      ) : null}

      {mode === 'batch' ? (
        <BatchView
          pages={sessionPages as unknown as BatchPageData[]}
          pageCount={pageCount}
          filterPresets={filterPresets}
          onBack={backToCamera}
          onClearAll={handleClearAll}
          onOpenPageEditor={handleOpenPageEditor}
          onMoveUp={movePageUp}
          onMoveDown={movePageDown}
          onRotate={rotatePage}
          onRemove={removePage}
          onApplyFilterToAll={(filterId) => handleApplyFilterToAll(sessionPages, filterId)}
          onRotateAll={handleRotateAll}
        />
      ) : null}

      {mode === 'advanced' ? (
        <AdvancedBatchView
          pages={sessionPages as unknown as AdvancedBatchPageData[]}
          onBack={backToCamera}
          onOpenPageEditor={handleOpenPageEditor}
          onMoveUp={movePageUp}
          onMoveDown={movePageDown}
          onRotate={rotatePage}
          onRemove={removePage}
          onReplacePages={(nextPages) => replacePages(nextPages as BatchPage[])}
          onAddPageLike={(page) => {
            addPage({
              uri: page.uri,
              filter: page.filter ?? 'original',
              corners: page.corners,
              enhanced: page.enhanced,
              capture: page.capture as CaptureResult | undefined,
              imageSession: page.imageSession as ImageSession | undefined,
              ocr: page.ocr as OcrResult | undefined,
              metadata: page.metadata as BatchPage['metadata'],
              selected: false,
            });
          }}
        />
      ) : null}

      {mode === 'edit' && activeSession && editablePage ? (
        <Animated.View style={{ flex: 1, opacity: editOpacity, transform: [{ translateY: editSlide }] }}>
          <EditView
            session={activeSession}
            isOptimizing={isOptimizing}
            compareUri={compareUri}
            onAcceptOptimize={handleAcceptOptimize}
            onRevertOptimize={handleRevertOptimize}
            onBack={handleCloseEdit}
            onDone={() => { handleCloseEdit(); onStartProcessing(); }}
            onStartCrop={handleStartCrop}
            onOptimize={handleOptimize}
            onRotate={handleRotateInEdit}
            onCropConfirm={handleCropConfirm}
            onCropConfirmAndAnalyze={handleCropConfirmAndAnalyze}
            onCropCancel={handleCropCancel}
            onManualAdjust={handleManualAdjust}
          />
        </Animated.View>
      ) : null}

      {mode === 'processing' ? (
        <AnalysisView
          pageCount={pageCount}
          onContinueAnyway={onAnalysisContinueAnyway}
          onRetry={onAnalysisRetry}
          onCancel={onAnalysisCancel}
        />
      ) : null}

      {showActionPicker ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D1117' }]} />
      ) : null}

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
        pageCount={pageCount}
        onSelect={handleActionSelect}
      />
    </View>
  );
}
