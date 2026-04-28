import { useCallback, useRef, useState } from 'react';
import type { DocumentCorners, AutoCaptureReadiness } from '../types';
import { useFrameProcessorBridge, type FrameScanResult } from '../engine/FrameProcessorBridge';
import { EdgeDetector } from '../engine/EdgeDetector';
import { AutoCaptureEngine } from '../engine/AutoCapture';

export interface FrameScannerState {
  corners: DocumentCorners | null;
  confidence: number;
  readiness: AutoCaptureReadiness;
  isStable: boolean;
  fromNative: boolean;
}

export interface FrameScannerOptions {
  enabled?: boolean;
  autoCaptureFps?: number;
  stabilityThreshold?: number;
  requiredDuration?: number;
  onAutoCapture?: () => void;
}

const DEFAULT_READINESS: AutoCaptureReadiness = {
  score: 0,
  motionConfidence: 0,
  edgeConfidence: 0,
  blurScore: 1,
  brightnessScore: 1,
  distortionScore: 1,
  stable: false,
  ready: false,
};

export function useFrameScanner(options: FrameScannerOptions = {}) {
  const {
    enabled = true,
    autoCaptureFps = 2,
    stabilityThreshold = 0.35,
    requiredDuration = 800,
    onAutoCapture,
  } = options;

  const [state, setState] = useState<FrameScannerState>({
    corners: null,
    confidence: 0,
    readiness: DEFAULT_READINESS,
    isStable: false,
    fromNative: false,
  });

  const edgeDetectorRef = useRef(new EdgeDetector());
  const autoCaptureRef = useRef(new AutoCaptureEngine({ threshold: stabilityThreshold, requiredDuration }));
  const hasTriggeredRef = useRef(false);

  const handleFrameResult = useCallback((result: FrameScanResult) => {
    if (!enabled) return;

    const { corners, quality, fromNative } = result;
    const confidence = corners?.confidence ?? 0;

    // Feed edge confidence into AutoCaptureEngine
    autoCaptureRef.current.updateEdgeConfidence(confidence);
    autoCaptureRef.current.updateQualityScores(
      quality.blur,
      quality.brightness,
      quality.aspectConfidence,
    );

    const readiness = autoCaptureRef.current.readiness;

    // Auto-trigger once when ready
    if (readiness.ready && !hasTriggeredRef.current && onAutoCapture) {
      hasTriggeredRef.current = true;
      autoCaptureRef.current.triggerFeedback();
      onAutoCapture();
      // Reset after 2s so next scan can trigger again
      setTimeout(() => { hasTriggeredRef.current = false; }, 2000);
    }

    setState({
      corners,
      confidence,
      readiness,
      isStable: readiness.stable,
      fromNative,
    });
  }, [enabled, onAutoCapture]);

  const { frameProcessor } = useFrameProcessorBridge(handleFrameResult, {
    fps: autoCaptureFps,
  });

  const reset = useCallback(() => {
    hasTriggeredRef.current = false;
    setState({ corners: null, confidence: 0, readiness: DEFAULT_READINESS, isStable: false, fromNative: false });
  }, []);

  return {
    frameProcessor,
    corners: state.corners,
    confidence: state.confidence,
    readiness: state.readiness,
    isStable: state.isStable,
    fromNative: state.fromNative,
    reset,
  };
}
