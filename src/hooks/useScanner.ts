import { useRef, useCallback, useState, useEffect, useMemo, type RefObject } from 'react';
import { CameraView } from 'expo-camera';
import {
  CameraEngine,
  CaptureResult,
  ScannerEvent,
  DocumentCorners,
} from '../modules/scanner';

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
  if (docWidth < 0.72) return 'closer';
  return 'perfect';
}

const CAPTURE_TIMEOUT_MS = 15_000;

export function useScanner() {
  const cameraRef    = useRef<CameraView>(null);
  const engineRef    = useRef<CameraEngine | null>(null);
  const mountedRef   = useRef(true);
  const [isReady,       setIsReady]       = useState(false);
  const [isCapturing,   setIsCapturing]   = useState(false);
  const [detectedEdges, setDetectedEdges] = useState<DocumentCorners | null>(null);
  const [stability,     setStability]     = useState({ isStable: false, confidence: 0 });
  const [lastCapture,   setLastCapture]   = useState<CaptureResult | null>(null);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const engine = new CameraEngine();
    engineRef.current  = engine;

    const unsubscribe = engine.addListener((event: ScannerEvent) => {
      if (!mountedRef.current) return;
      switch (event.type) {
        case 'edges_detected':
          setDetectedEdges(event.corners);
          break;
        case 'stability_changed':
          setStability({ isStable: event.state.isStable, confidence: event.state.confidence });
          break;
        case 'capture_complete':
          setLastCapture(event.result);
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

  const processFrame = useCallback((frame: any) => {
    engineRef.current?.processFrame(frame);
  }, []);

  const distanceHint = useMemo(() => computeDistanceHint(detectedEdges), [detectedEdges]);

  return {
    cameraRef,
    setCameraRef,
    isReady,
    isCapturing,
    detectedEdges,
    distanceHint,
    stability,
    lastCapture,
    error,
    capture,
    updateConfig,
    processFrame,
  };
}
