import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, Animated, type AppStateStatus } from 'react-native';
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

const hintStyles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 140, left: 0, right: 0, alignItems: 'center' },
  text: {
    color: '#fff', fontSize: 14, fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.40)', overflow: 'hidden',
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
  },
  captured: {
    backgroundColor: 'rgba(34,197,94,0.85)',
  },
});

export default function CameraView(props: CameraViewProps) {
  const {
    cameraRef, hasPermission, onRequestPermission, onOpenGallery,
    stability,
    isCapturing, onCapture,
    pageCount, pages, onBatchPress, onRemovePage, onOpenPageEditor,
    insets, onClose,
    detectedCorners,
    edgesAreFresh,
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

  // Capture feedback state
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const [showCaptureToast, setShowCaptureToast] = useState(false);
  const captureToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPageCountRef = useRef(pageCount);
  const lastCaptureToastRef = useRef(0);

  useEffect(() => {
    if (pageCount > prevPageCountRef.current) {
      const now = Date.now();
      // Debounce: don't spam toast if multiple captures fire rapidly (< 800ms apart)
      if (now - lastCaptureToastRef.current > 800) {
        lastCaptureToastRef.current = now;
        // White flash: 0 → 1 instantly, fade to 0 in 160ms
        flashOpacity.setValue(1);
        Animated.timing(flashOpacity, { toValue: 0, duration: 160, useNativeDriver: true }).start();
        // Toast
        if (captureToastTimerRef.current) clearTimeout(captureToastTimerRef.current);
        setShowCaptureToast(true);
        captureToastTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setShowCaptureToast(false);
        }, 1800);
      }
    }
    prevPageCountRef.current = pageCount;
  }, [pageCount, flashOpacity]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (captureToastTimerRef.current) clearTimeout(captureToastTimerRef.current);
    };
  }, []);

  if (!hasPermission) return <PermissionView onRequest={onRequestPermission} onOpenGallery={onOpenGallery} />;

  const cameraActive = isFocused && hasPermission;
  // Green guide brackets only when no polygon is detected (searching state)
  const cornerColor = 'rgba(255,255,255,0.85)';

  // TTL-retained corners (stale): edgesAreFresh=false but detectedCorners still set
  const fresh = edgesAreFresh !== false;
  // "Dokument erkannt" hint only shows when corners are fresh
  const isDocumentDetected = !!detectedCorners && fresh;

  const hintText = showCaptureToast
    ? 'Dokument aufgenommen'
    : (isDocumentDetected ? 'Dokument erkannt' : 'Dokument in den Rahmen');

  return (
    <View style={[styles.fill, { backgroundColor: '#000' }]}>
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

      {/* Document overlay — dims when corners are TTL-retained (stale) */}
      {detectedCorners ? (
        <View
          style={[StyleSheet.absoluteFill, { opacity: fresh ? 1 : 0.38 }]}
          pointerEvents="none"
        >
          <DocumentOverlay
            corners={detectedCorners}
            showGlow={stability.isStable && fresh}
            glowColor={stability.isStable && fresh ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.06)'}
          />
        </View>
      ) : (
        <View style={styles.guideFrame}>
          {[styles.cornerTL, styles.cornerTR, styles.cornerBL, styles.cornerBR].map((cornerStyle, i) => (
            <View key={i} style={[styles.corner, cornerStyle, { borderColor: cornerColor }]} />
          ))}
        </View>
      )}

      <CameraTopBar topInset={insets.top} pageCount={pageCount} onClose={onClose} />

      {/* Status hint — bottom center, above the shutter bar */}
      <View style={hintStyles.wrap} pointerEvents="none">
        <Text style={[hintStyles.text, showCaptureToast && hintStyles.captured]}>
          {hintText}
        </Text>
      </View>

      {/* White flash overlay on capture */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: flashOpacity }]}
      />

      <CameraBottomBar
        bottomInset={insets.bottom}
        stability={stability}
        isCapturing={isCapturing}
        pageCount={pageCount}
        onCapture={onCapture}
        onBatchPress={onBatchPress}
        onOpenGallery={onOpenGallery}
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
