import { useCallback, useState } from 'react';
import type { ScanQualityPresetId } from '@/modules/scanner/flow/scanQualityProfiles';

export type ScanMode = 'camera' | 'edit' | 'batch' | 'advanced' | 'processing';

export function useScanFlowController() {
  const [mode, setMode] = useState<ScanMode>('camera');
  const [autoCapture, setAutoCaptureState] = useState(false);
  const [autoCapturePreferenceSet, setAutoCapturePreferenceSet] = useState(false);
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [qualityPreset, setQualityPreset] = useState<ScanQualityPresetId>('auto');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editReturnMode, setEditReturnMode] = useState<'camera' | 'batch'>('camera');

  const toggleFlash = useCallback(() => setFlash(f => (f === 'off' ? 'on' : 'off')), []);
  const setAutoCapture = useCallback((value: boolean) => {
    setAutoCapturePreferenceSet(true);
    setAutoCaptureState(value);
  }, []);
  const toggleAutoCapture = useCallback(() => {
    setAutoCapturePreferenceSet(true);
    setAutoCaptureState(v => !v);
  }, []);
  const goToBatch = useCallback(() => setMode('batch'), []);
  const backToCamera = useCallback(() => setMode('camera'), []);
  const openActionPicker = useCallback(() => setShowActionPicker(true), []);
  const closeActionPicker = useCallback(() => setShowActionPicker(false), []);

  const startEditing = useCallback((pageId: string, currentMode: ScanMode) => {
    setEditingPageId(pageId);
    setEditReturnMode(currentMode === 'batch' ? 'batch' : 'camera');
    setMode('edit');
  }, []);

  const stopEditing = useCallback(() => {
    setEditingPageId(null);
    setMode(editReturnMode);
  }, [editReturnMode]);

  return {
    mode,
    setMode,
    autoCapture,
    setAutoCapture,
    autoCapturePreferenceSet,
    toggleAutoCapture,
    showActionPicker,
    setShowActionPicker,
    openActionPicker,
    closeActionPicker,
    flash,
    setFlash,
    toggleFlash,
    qualityPreset,
    setQualityPreset,
    editingPageId,
    setEditingPageId,
    editReturnMode,
    setEditReturnMode,
    startEditing,
    stopEditing,
    goToBatch,
    backToCamera,
  };
}
