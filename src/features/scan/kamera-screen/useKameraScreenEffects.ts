import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { withRepeat, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { CameraView as ExpoCameraView } from 'expo-camera';

import type { BatchPage } from '@/modules/batch';
import type { CaptureResult } from '@/modules/scanner';
import { getScanQualityProfile, type ScanQualityPresetId } from '@/modules/scanner/flow/scanQualityProfiles';
import { SCREEN_H } from '@/features/scan/constants';

/** updateConfig nimmt partiellen Scanner-State (useScanner). */
export function useKameraScreenEffects(opts: {
  setCameraRef: (r: RefObject<ExpoCameraView>) => void;
  cameraRef: RefObject<ExpoCameraView | null>;
  autoCapture: boolean;
  flash: 'off' | 'on';
  mode: string;
  qualityPreset: string;
  captureFilterId: string;
  updateConfig: (c: {
    autoCapture?: boolean;
    flash?: boolean | string;
    filter?: string;
    exposure?: number;
    enableEdgeDetection?: boolean;
    enablePerspectiveCorrection?: boolean;
  }) => void;
  setCaptureFilterId: (id: string) => void;
  setActiveFilter: (id: string) => void;
  lastCapture: CaptureResult | null;
  createFromCapture: (c: CaptureResult) => unknown;
  addPage: (page: Omit<BatchPage, 'id' | 'order' | 'createdAt'>) => BatchPage | undefined;
  scanLineY: SharedValue<number>;
  editSlide: Animated.Value;
  editOpacity: Animated.Value;
}): void {
  const lastHandledCapture = useRef<number | null>(null);
  const {
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
  } = opts;

  useEffect(() => {
    setCameraRef(cameraRef as RefObject<ExpoCameraView>);
  }, [cameraRef, setCameraRef]);

  useEffect(() => {
    const profile = getScanQualityProfile(qualityPreset as ScanQualityPresetId);
    updateConfig({
      autoCapture: (autoCapture || profile.autoCapture) && mode === 'camera',
      flash,
      filter: captureFilterId,
      exposure: profile.exposure,
      enableEdgeDetection: profile.edgeDetection,
      enablePerspectiveCorrection: profile.perspectiveCorrection,
    });
  }, [autoCapture, captureFilterId, flash, mode, qualityPreset, updateConfig]);

  useEffect(() => {
    const profile = getScanQualityProfile(qualityPreset as ScanQualityPresetId);
    if (profile.preferredFilter && profile.preferredFilter !== captureFilterId) {
      setCaptureFilterId(profile.preferredFilter);
      setActiveFilter(profile.preferredFilter);
    }
  }, [captureFilterId, qualityPreset, setActiveFilter, setCaptureFilterId]);

  useEffect(() => {
    scanLineY.value =
      mode === 'camera' && autoCapture
        ? withRepeat(withTiming(SCREEN_H * 0.7, { duration: 2000 }), -1, true)
        : 0;
  }, [autoCapture, mode, scanLineY]);

  useEffect(() => {
    if (!lastCapture || lastHandledCapture.current === lastCapture.timestamp) return;
    lastHandledCapture.current = lastCapture.timestamp;
    const imageSession = createFromCapture(lastCapture);
    addPage({
      uri: lastCapture.finalUri,
      filter: lastCapture.processing.filter,
      enhanced: lastCapture.processing.enhancementApplied,
      capture: lastCapture,
      imageSession: imageSession as BatchPage['imageSession'],
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [addPage, createFromCapture, lastCapture]);

  useEffect(() => {
    if (mode === 'edit') {
      editSlide.setValue(60);
      editOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(editSlide, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 260 }),
        Animated.timing(editOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [editOpacity, editSlide, mode]);
}
