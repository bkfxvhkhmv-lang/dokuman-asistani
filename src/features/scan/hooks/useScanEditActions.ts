import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { optimizeDocumentImage } from '@/modules/image-processing/engine/SkiaDocumentOptimizer';
import type { ManualAdjustValues } from '@/modules/image-processing/engine/SkiaManualAdjuster.values';
import type { EditTransitionEvent } from '@/features/scan/state/EditStateMachine';

interface UseScanEditActionsDeps {
  activeSession: any;
  editablePage: any;
  editingPageId: string | null;
  imageSessionManager: any;
  updatePage: (id: string, payload: any) => void;
  loadSession: (session: any) => void;
  applyCropResult: (uri: string) => void;
  transitionEditMode: (event: EditTransitionEvent) => any;
  rotatePage: (id: string) => Promise<boolean | undefined | void>;
  setFilterPreviewUri: (uri: string | null) => void;
  stopEditing: () => void;
  setMode: (mode: 'camera' | 'edit' | 'batch' | 'advanced' | 'processing') => void;
}

export function useScanEditActions({
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
}: UseScanEditActionsDeps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [compareUri, setCompareUri] = useState<string | null>(null);

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
      setCompareUri(sourceUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('[useScanEditActions] handleOptimize error', e);
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
    setFilterPreviewUri(null);
    const startTransition = transitionEditMode('start-rotate');
    await rotatePage(editingPageId);
    if (startTransition.allowed) {
      transitionEditMode('finish-rotate');
    }
  }, [editingPageId, rotatePage, setFilterPreviewUri, transitionEditMode]);

  const handleCloseEdit = useCallback(() => {
    transitionEditMode('close-editor');
    setCompareUri(null);
    stopEditing();
  }, [stopEditing, transitionEditMode]);

  const applyCropToEditablePage = useCallback((croppedUri: string) => {
    if (!editablePage) return;
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
  }, [activeSession, applyCropResult, editablePage, imageSessionManager, transitionEditMode, updatePage]);

  const handleCropConfirm = useCallback((croppedUri: string) => {
    applyCropToEditablePage(croppedUri);
  }, [applyCropToEditablePage]);

  const handleCropConfirmAndAnalyze = useCallback((croppedUri: string) => {
    applyCropToEditablePage(croppedUri);
    setMode('batch');
  }, [applyCropToEditablePage, setMode]);

  const handleCropCancel = useCallback(() => {
    transitionEditMode('cancel-crop');
  }, [transitionEditMode]);

  const handleManualAdjust = useCallback((adjustedUri: string, _values: ManualAdjustValues) => {
    if (!editablePage || !activeSession) return;
    if (!adjustedUri) return;

    const sourceUri = activeSession.finalUri
      ?? activeSession.croppedUri
      ?? activeSession.correctedUri
      ?? activeSession.originalUri;

    if (adjustedUri === sourceUri) return;

    const updatedSession = imageSessionManager.commitFilter(activeSession, 'manual', adjustedUri);
    updatePage(editablePage.id, {
      uri: adjustedUri,
      filter: 'manual',
      enhanced: true,
      imageSession: updatedSession,
      capture: editablePage.capture ? {
        ...editablePage.capture,
        uri: adjustedUri,
        finalUri: adjustedUri,
        enhancedUri: adjustedUri,
        filterApplied: 'manual',
        processing: {
          ...editablePage.capture.processing,
          filter: 'manual',
          enhancementApplied: true,
        },
      } : editablePage.capture,
    });
    loadSession(updatedSession);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [activeSession, editablePage, imageSessionManager, loadSession, updatePage]);

  return {
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
  };
}
