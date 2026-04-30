import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, AppState, type AppStateStatus } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { CameraView as ExpoCameraView } from 'expo-camera';
import PermissionView from '@/features/scan/components/PermissionView';
import CameraTopBar from '@/features/scan/components/camera-view/CameraTopBar';
import CameraBottomBar from '@/features/scan/components/camera-view/CameraBottomBar';
import CameraThumbnailStrip from '@/features/scan/components/camera-view/CameraThumbnailStrip';
import { DocumentOverlay } from '@/components/scanner/DocumentOverlay';
import { styles } from '@/features/scan/styles';
import { SUCCESS } from '@/features/scan/constants';
import { useScan } from '@/features/scan/context/ScanContext';
import type { CameraViewProps } from '@/features/scan/components/camera-view/types';

export type {
  StabilityState,
  BatchPage,
  FilterPreset,
  CameraViewProps,
} from '@/features/scan/components/camera-view/types';

export default function CameraView(props: CameraViewProps) {
  const {
    cameraRef, hasPermission, onRequestPermission,
    stability,
    isCapturing, onCapture,
    pageCount, pages, onBatchPress, onRemovePage, onOpenPageEditor,
    insets, onClose,
    detectedCorners,
  } = props;

  const { flash } = useScan();
  const isFocused = useIsFocused();
  const appStateRef = useRef(AppState.currentState);
  const [sessionKey, setSessionKey] = useState(0);

  const bumpSession = useCallback(() => setSessionKey(k => k + 1), []);

  const prevFocusedRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevFocusedRef.current === false && isFocused && hasPermission) bumpSession();
    prevFocusedRef.current = isFocused;
  }, [isFocused, hasPermission, bumpSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if ((prev === 'inactive' || prev === 'background') && next === 'active' && isFocused) {
        bumpSession();
      }
    });
    return () => sub.remove();
  }, [bumpSession, isFocused]);

  if (!hasPermission) return <PermissionView onRequest={onRequestPermission} />;

  const cameraActive = isFocused && hasPermission;
  const cornerColor = stability.isStable ? SUCCESS : 'rgba(255,255,255,0.85)';

  return (
    <View style={styles.fill}>
      <ExpoCameraView
        key={`cam-${sessionKey}`}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flash}
        zoom={0}
        active={cameraActive}
        onMountError={(e) => {
          if (__DEV__) console.warn('[CameraView] onMountError — remount', e?.message ?? e);
          bumpSession();
        }}
      />

      {detectedCorners ? (
        <DocumentOverlay
          corners={detectedCorners}
          showGlow={stability.isStable}
          glowColor={stability.isStable ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.06)'}
        />
      ) : (
        <View style={styles.guideFrame}>
          {[styles.cornerTL, styles.cornerTR, styles.cornerBL, styles.cornerBR].map((cornerStyle, i) => (
            <View key={i} style={[styles.corner, cornerStyle, { borderColor: cornerColor }]} />
          ))}
        </View>
      )}

      <CameraTopBar topInset={insets.top} onClose={onClose} />

      <CameraBottomBar
        bottomInset={insets.bottom}
        stability={stability}
        isCapturing={isCapturing}
        pageCount={pageCount}
        onCapture={onCapture}
        onBatchPress={onBatchPress}
      />

      {pageCount > 0 && (
        <CameraThumbnailStrip
          bottomOffset={insets.bottom + 120}
          pages={pages}
          onRemovePage={onRemovePage}
          onOpenPageEditor={onOpenPageEditor}
        />
      )}
    </View>
  );
}
