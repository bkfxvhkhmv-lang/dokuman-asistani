import { useRef, useCallback, useState, useEffect, useMemo, type RefObject } from 'react';
import { CameraView } from 'expo-camera';
import {
  CameraEngine,
  CaptureResult,
  ScannerEvent,
  DocumentCorners,
  AutoCaptureReadiness,
} from '@/modules/scanner';
import { hasNativeScannerModule } from '@/modules/scanner/native';

export type DistanceHint = 'closer' | 'farther' | 'perfect' | null;

// Guide frame is 95% of screen width, centered. In normalized camera coords (0–1):
// perfectly-framed A4 spans ~0.025…0.975 horizontally → docWidth ≈ 0.95
function computeDistanceHint(corners: DocumentCorners | null): DistanceHint {
  if (!corners || corners.confidence < 0.35) return null;
  const docWidth = Math.max(
    Math.abs(corners.topRight.x - corners.topLeft.x),
    Math.abs(corners.bottomRight.x - corners.bottomLeft.x),
  );
  if (docWidth > 0.97) return 'farther';
  if (docWidth < 0.52) return 'closer';
  return 'perfect';
}

const CAPTURE_TIMEOUT_MS = 15_000;

export function useScanner() {
  const cameraRef    = useRef<CameraView>(null);
  const engineRef    = useRef<CameraEngine | null>(null);
  const mountedRef   = useRef(true);
  const clearEdgesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isReady,               setIsReady]               = useState(false);
  const [isCapturing,           setIsCapturing]           = useState(false);
  const [detectedEdges,         setDetectedEdges]         = useState<DocumentCorners | null>(null);
  const [edgesAreFresh,         setEdgesAreFresh]         = useState(false);
  const [stability,             setStability]             = useState({ isStable: false, confidence: 0 });
  const [lastCapture,           setLastCapture]           = useState<CaptureResult | null>(null);
  const [error,                 setError]                 = useState<string | null>(null);
  const [autoCaptureReadiness,  setAutoCaptureReadiness]  = useState<AutoCaptureReadiness>({
    score: 0, motionConfidence: 0, edgeConfidence: 0,
    blurScore: 1, brightnessScore: 1, distortionScore: 1,
    stable: false, ready: false, countdownProgress: 0,
  });
  const [lastCaptureSource,     setLastCaptureSource]     = useState<'manual' | 'auto'>('manual');
  /** Wird gesetzt bevor capture() feuert — auto überschreibt es, wenn capture_ready ankommt. */
  const pendingSourceRef = useRef<'manual' | 'auto'>('manual');

  useEffect(() => {
    mountedRef.current = true;
    const engine = new CameraEngine();
    engineRef.current  = engine;

    const unsubscribe = engine.addListener((event: ScannerEvent) => {
      if (!mountedRef.current) return;
      switch (event.type) {
        case 'edges_detected':
          if (clearEdgesTimerRef.current) { clearTimeout(clearEdgesTimerRef.current); clearEdgesTimerRef.current = null; }
          if (__DEV__) console.log('[useScanner] edges_detected confidence=' + event.corners?.confidence?.toFixed(3) + ' tl=' + event.corners.topLeft.x.toFixed(3) + ',' + event.corners.topLeft.y.toFixed(3));
          setEdgesAreFresh(true);
          setDetectedEdges(event.corners);
          break;
        case 'edge_state_changed':
          if (__DEV__) console.log('[useScanner] edge_state_changed detected=' + String(event.state.detected) + ' conf=' + event.state.confidence.toFixed(3));
          if (!event.state.detected) {
            setEdgesAreFresh(false);
            // Start 600ms countdown on the FIRST loss of detection; do not roll it on subsequent
            // detected=false events — rolling causes the polygon to persist until the native scanner
            // goes completely silent (~600ms of total silence at 30fps), not 600ms after detection ends.
            if (!clearEdgesTimerRef.current) {
              clearEdgesTimerRef.current = setTimeout(() => {
                clearEdgesTimerRef.current = null;
                if (mountedRef.current) setDetectedEdges(null);
              }, 600);
            }
          }
          break;
        case 'stability_changed':
          setStability({ isStable: event.state.isStable, confidence: event.state.confidence });
          break;
        case 'auto_capture_ready':
          setAutoCaptureReadiness(event.readiness);
          break;
        case 'capture_ready':
          // Auto-Capture wird gleich feuern — Quelle vormerken
          pendingSourceRef.current = 'auto';
          break;
        case 'capture_complete':
          setLastCapture(event.result);
          setLastCaptureSource(pendingSourceRef.current);
          // Lock nach erfolgreicher manueller Aufnahme (nur wenn wirklich Foto gemacht)
          if (pendingSourceRef.current === 'manual') {
            engineRef.current?.lockManualCapture();
          }
          pendingSourceRef.current = 'manual'; // für nächste Aufnahme zurücksetzen
          setIsCapturing(false);
          break;
        case 'error':
          setError(event.error.message);
          setIsCapturing(false);
          break;
      }
    });

    setIsReady(true);

    return () => {
      mountedRef.current = false;
      if (clearEdgesTimerRef.current) clearTimeout(clearEdgesTimerRef.current);
      unsubscribe();
      engine.dispose();
    };
  }, []);

  const setCameraRef = useCallback((ref: RefObject<CameraView>) => {
    if (engineRef.current) engineRef.current.setCameraRef(ref);
    cameraRef.current = ref.current;
  }, []);

  const capture = useCallback(async () => {
    if (!engineRef.current || isCapturing) return null;

    // Manuelle Auslösung — Quelle setzen, bevor auto_capture_ready es überschreiben könnte
    pendingSourceRef.current = 'manual';
    setIsCapturing(true);
    setError(null);

    const timeout = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Capture timeout')), CAPTURE_TIMEOUT_MS)
    );

    try {
      const result = await Promise.race([engineRef.current.capture(), timeout]);
      return result;
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Capture failed');
        setIsCapturing(false);
      }
      return null;
    }
  }, [isCapturing]);

  const updateConfig = useCallback((config: any) => {
    engineRef.current?.updateConfig(config);
  }, []);

  const setViewDimensions = useCallback((w: number, h: number) => {
    engineRef.current?.setViewDimensions(w, h);
  }, []);

  const processFrame = useCallback((frame: any) => {
    engineRef.current?.processFrame(frame);
  }, []);

  const startLiveEdgeDetection = useCallback((intervalMs?: number) => {
    engineRef.current?.startLiveEdgeDetection(intervalMs);
  }, []);

  const stopLiveEdgeDetection = useCallback(() => {
    engineRef.current?.stopLiveEdgeDetection();
  }, []);

  const lockManualCapture = useCallback(() => {
    engineRef.current?.lockManualCapture();
  }, []);

  const distanceHint = useMemo(() => computeDistanceHint(detectedEdges), [detectedEdges]);

  return {
    cameraRef,
    setCameraRef,
    isReady,
    isCapturing,
    detectedEdges,
    edgesAreFresh,
    distanceHint,
    stability,
    lastCapture,
    lastCaptureSource,
    autoCaptureReadiness,
    lockManualCapture,
    error,
    capture,
    updateConfig,
    setViewDimensions,
    processFrame,
    startLiveEdgeDetection,
    stopLiveEdgeDetection,
    nativeAvailable: hasNativeScannerModule(),
  };
}
