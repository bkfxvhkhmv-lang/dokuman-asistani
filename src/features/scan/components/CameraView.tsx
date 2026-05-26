import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState, Animated, type AppStateStatus, Easing } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { LiveScannerView } from '@/modules/scanner/engine/LiveScannerView';
import PermissionView from '@/features/scan/components/PermissionView';
import CameraTopBar from '@/features/scan/components/camera-view/CameraTopBar';
import CameraBottomBar from '@/features/scan/components/camera-view/CameraBottomBar';
import CameraThumbnailStrip from '@/features/scan/components/camera-view/CameraThumbnailStrip';
import { DocumentOverlay } from '@/components/scanner/DocumentOverlay';
import { styles } from '@/features/scan/styles';
import { SUCCESS } from '@/features/scan/constants';
import { useScan } from '@/features/scan/context/ScanContext';
import type { CameraViewProps } from '@/features/scan/components/camera-view/types';
import { runQualityGateFromCorners } from '@/modules/scanner/engine/camera-quality-gate';
import { getStatusText } from '@/modules/scanner/engine/camera-overlay-color';

export type {
  StabilityState,
  BatchPage,
  FilterPreset,
  CameraViewProps,
} from '@/features/scan/components/camera-view/types';

const hintStyles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  text: {
    color: '#fff', fontSize: 14, fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.40)', overflow: 'hidden',
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
  },
  /** Manuell aufgenommen — grün */
  captured: {
    backgroundColor: 'rgba(34,197,94,0.85)',
  },
  /** Automatisch aufgenommen — blau-violett, deutlich anders als manuell */
  capturedAuto: {
    backgroundColor: 'rgba(99,102,241,0.90)',
  },
  /** AUTO-Label wenn kein Countdown aktiv */
  autoIdleText: {
    fontSize: 11, letterSpacing: 1.2, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(34,197,94,0.18)',
    color: '#D7FFE6',
  },
  /** Countdown-Pill mit Füllbalken */
  countdownPill: {
    height: 32, minWidth: 110, borderRadius: 999, overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.50)', borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.55)', justifyContent: 'center', alignItems: 'center',
  },
  /** Fortschrittsbalken im Hintergrund der Pill */
  countdownFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(99,102,241,0.40)',
  },
  countdownText: {
    color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.3,
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
    distanceHint,
    autoCaptureReadiness,
    lastCaptureSource = 'manual',
  } = props;

  const { flash, autoCapture } = useScan();
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
  const [captureToastSource, setCaptureToastSource] = useState<'manual' | 'auto'>('manual');
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
        // Toast — Quelle merken für unterschiedliches Feedback
        setCaptureToastSource(lastCaptureSource);
        if (captureToastTimerRef.current) clearTimeout(captureToastTimerRef.current);
        setShowCaptureToast(true);
        captureToastTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setShowCaptureToast(false);
        }, 1800);
      }
    }
    prevPageCountRef.current = pageCount;
  }, [pageCount, flashOpacity, lastCaptureSource]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (captureToastTimerRef.current) clearTimeout(captureToastTimerRef.current);
    };
  }, []);

  // Guide pulse — breathes while searching (no corners detected)
  const guidePulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (detectedCorners) {
      guidePulse.stopAnimation();
      guidePulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(guidePulse, { toValue: 0.45, duration: 1100, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(guidePulse, { toValue: 1,    duration: 1100, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [!!detectedCorners, guidePulse]);

  const fresh = edgesAreFresh !== false;
  const liveQuality = runQualityGateFromCorners(detectedCorners);
  const isDocumentDetected = !!detectedCorners
    && fresh
    && (liveQuality.tier === 'good' || liveQuality.tier === 'excellent');

  useEffect(() => {
    if (__DEV__) console.log('[CameraView] render corners=' + String(!!detectedCorners) + ' fresh=' + String(fresh) + ' doc=' + String(isDocumentDetected) + ' tier=' + liveQuality.tier);
  }, [detectedCorners, fresh, isDocumentDetected, liveQuality.tier]);

  if (!hasPermission) return <PermissionView onRequest={onRequestPermission} onOpenGallery={onOpenGallery} />;

  const cameraActive = isFocused && hasPermission;
  // Green guide brackets only when no polygon is detected (searching state)
  const cornerColor = 'rgba(255,255,255,0.85)';

  // TTL-retained corners (stale): edgesAreFresh=false but detectedCorners still set

  // Toast-Text: manuell vs. automatisch unterscheiden
  const captureToastText = captureToastSource === 'auto'
    ? '⚡ Auto aufgenommen'
    : '✓ Dokument aufgenommen';

  const hintText = showCaptureToast
    ? captureToastText
    : getStatusText(liveQuality, distanceHint ?? null, !!detectedCorners && fresh);

  // Countdown-Anzeige: nur wenn Auto aktiv und Countdown läuft
  const showCountdown = autoCapture && !showCaptureToast
    && autoCaptureReadiness !== undefined
    && autoCaptureReadiness.ready
    && autoCaptureReadiness.countdownProgress > 0
    && autoCaptureReadiness.countdownProgress < 1;

  const countdownSecsLeft = showCountdown
    ? Math.max(0, (1 - autoCaptureReadiness!.countdownProgress) * 1.4).toFixed(1)
    : null;

  return (
    <View style={[styles.fill, { backgroundColor: '#000' }]}>
      <LiveScannerView
        style={StyleSheet.absoluteFill}
        flash={flash === 'on' ? 'on' : 'off'}
        zoom={0}
        active={cameraActive}
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
        // top: insets.top+64 keeps guide frame below the safe area + top bar (never under notch)
        <Animated.View style={[styles.guideFrame, { top: insets.top + 64, opacity: guidePulse }]}>
          {[styles.cornerTL, styles.cornerTR, styles.cornerBL, styles.cornerBR].map((cornerStyle, i) => (
            <View key={i} style={[styles.corner, cornerStyle, { borderColor: cornerColor }]} />
          ))}
          {!showCaptureToast && (
            <Text style={styles.guideLabel}>Dokument hier{'\n'}einrahmen</Text>
          )}
        </Animated.View>
      )}

      <CameraTopBar topInset={insets.top} pageCount={pageCount} onClose={onClose} />

      {/* Auto-Capture-Indikator: Countdown wenn bereit, sonst stille Statusanzeige */}
      {autoCapture ? (
        <View style={[hintStyles.wrap, { bottom: insets.bottom + 144 }]} pointerEvents="none">
          {showCountdown ? (
            <View style={hintStyles.countdownPill}>
              <View style={[hintStyles.countdownFill, { width: `${autoCaptureReadiness!.countdownProgress * 100}%` as any }]} />
              <Text style={hintStyles.countdownText}>Auto in {countdownSecsLeft}s</Text>
            </View>
          ) : (
            <Text style={[hintStyles.text, hintStyles.autoIdleText]}>AUTO</Text>
          )}
        </View>
      ) : null}

      {/* Status hint — sits just above the shutter bar, inset-aware */}
      <View style={[hintStyles.wrap, { bottom: insets.bottom + 108 }]} pointerEvents="none">
        <Text style={[
          hintStyles.text,
          showCaptureToast && (captureToastSource === 'auto' ? hintStyles.capturedAuto : hintStyles.captured),
        ]}>
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
          bottomOffset={insets.bottom + 190}
          pages={pages}
          onRemovePage={onRemovePage}
          onOpenPageEditor={onOpenPageEditor}
        />
      )}
    </View>
  );
}
