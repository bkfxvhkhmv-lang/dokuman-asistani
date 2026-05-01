/**
 * Dosya küçük görüntü düzenleyici ana ekranı — orchestrator.
 * Üst başlık, kırpma editörü, önizleme + araç çubuğu/modüller `edit-view/` altında.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CropEditor from '@/components/image-processing/CropEditor';
import EditActionBar from '@/features/scan/components/EditActionBar';
import { deriveEditUiState } from '@/features/scan/state/EditStateMachine';
import { useEditAnimations } from '@/features/scan/hooks/useEditAnimations';
import { usePinchZoom } from '@/features/scan/hooks/usePinchZoom';
import { useScanI18n } from '@/hooks/useScanI18n';
import type { ManualAdjustValues } from '@/modules/image-processing/engine/SkiaManualAdjuster.values';
import ManualAdjustSheet from '@/features/scan/components/ManualAdjustSheet';
import { BG_DARK } from '@/features/scan/constants';

import EditViewHeader from '@/features/scan/components/edit-view/EditViewHeader';
import EditPreviewPanel from '@/features/scan/components/edit-view/EditPreviewPanel';
import CompareOptimizeBar from '@/features/scan/components/edit-view/CompareOptimizeBar';
import { getSessionUri } from '@/features/scan/components/edit-view/utils';
import type { EditViewProps } from '@/features/scan/components/edit-view/types';

export type { EditViewProps };

export default function EditView(props: EditViewProps) {
  const {
    session,
    isOptimizing,
    compareUri,
    onAcceptOptimize,
    onRevertOptimize,
    onBack,
    onDone,
    onStartCrop,
    onOptimize,
    onRotate,
    onCropConfirm,
    onCropConfirmAndAnalyze,
    onCropCancel,
    onManualAdjust,
  } = props;

  const { t } = useScanI18n();
  const insets      = useSafeAreaInsets();
  const editMode    = session.editMode ?? 'none';
  const editUiState = deriveEditUiState(editMode);
  const quality     = session.quality?.overallScore;

  const anim = useEditAnimations(editMode);
  const zoom = usePinchZoom();

  const [showAdjust, setShowAdjust] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => { setShowOriginal(false); }, [compareUri]);

  const previewUri = (compareUri && showOriginal) ? compareUri : getSessionUri(session);

  const handleRotate = () => {
    anim.triggerRotateHint();
    onRotate();
  };

  const prevMode = useRef(editMode);
  useEffect(() => {
    if (prevMode.current !== editMode) {
      anim.triggerModeChange();
      prevMode.current = editMode;
    }
  }, [editMode]);

  useEffect(() => {
    if (editMode === 'crop') zoom.reset();
  }, [editMode]);

  const rotateDeg = anim.rotateSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const bottomPad = Math.max(20, insets.bottom + 12);

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: BG_DARK, opacity: anim.headerOpacity }]}>
      <EditViewHeader
        paddingTop={Math.max(20, insets.top)}
        title={t('scan.edit_page')}
        reviewHint={editUiState.showsCropEditor ? undefined : t('scan.review_hint')}
        continueLabel={t('scan.continue')}
        showContinue={!!onDone && !editUiState.showsCropEditor}
        onBack={onBack}
        onDone={onDone}
        quality={typeof quality === 'number' ? quality : null}
      />

      {editUiState.showsCropEditor ? (
        <CropEditor
          visible
          presentation="inline"
          uri={session.finalUri}
          confirmLabel={t('scan.crop')}
          secondaryConfirmLabel={t('scan.crop_analyze')}
          onConfirm={onCropConfirm}
          onConfirmAndAnalyze={onCropConfirmAndAnalyze}
          onCancel={onCropCancel}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <EditPreviewPanel
            zoom={zoom}
            previewUri={previewUri}
            imageOpacity={anim.imageOpacityA}
            rotateDeg={rotateDeg}
            editModeShowsRotateOverlay={editMode === 'rotate'}
          />

          {compareUri ? (
            <CompareOptimizeBar
              paddingBottom={bottomPad}
              showOriginal={showOriginal}
              onSelectOriginal={() => setShowOriginal(true)}
              onSelectOptimized={() => setShowOriginal(false)}
              onRevert={onRevertOptimize}
              onAccept={onAcceptOptimize}
              labelOriginal={t('scan.original')}
              labelEnhanced={t('scan.readable_enhanced')}
              labelHint={t('scan.optimized_hint')}
              labelUndo={t('scan.undo')}
              labelKeep={t('scan.keep')}
            />
          ) : (
            <View style={{ paddingBottom: bottomPad }}>
              <EditActionBar
                toolbarMode={editUiState.toolbarMode}
                isOptimizing={isOptimizing}
                onStartCrop={onStartCrop}
                onOptimize={onOptimize}
                onRotate={handleRotate}
                onAdjust={onManualAdjust ? () => setShowAdjust(true) : undefined}
                adjustLabel={t('scan.adjust')}
              />
            </View>
          )}
        </View>
      )}

      {onManualAdjust && (
        <ManualAdjustSheet
          visible={showAdjust}
          imageUri={getSessionUri(session) ?? null}
          onCancel={() => setShowAdjust(false)}
          onApply={(uri: string, values: ManualAdjustValues) => {
            setShowAdjust(false);
            onManualAdjust(uri, values);
          }}
        />
      )}
    </Animated.View>
  );
}
