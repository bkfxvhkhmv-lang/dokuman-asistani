import { useState, useEffect, useRef, useCallback } from 'react';
import { AutoCaptureEngine } from './engine/AutoCapture';
import type { AutoCaptureReadiness } from './types';

interface AutoCaptureConfig {
  threshold?: number;
  requiredDuration?: number;
  autoTriggerDelay?: number;
  readinessThreshold?: number;
}

export function useAutoCapture(config?: AutoCaptureConfig) {
  const engineRef = useRef<AutoCaptureEngine | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [readiness, setReadiness] = useState<AutoCaptureReadiness>({
    score: 0, stable: false, ready: false,
    motionConfidence: 0, edgeConfidence: 0, blurScore: 1, brightnessScore: 1, distortionScore: 1,
  });
  const [enabled, setEnabled] = useState(false);

  if (!engineRef.current) {
    engineRef.current = new AutoCaptureEngine(config);
  }

  const engine = engineRef.current;

  useEffect(() => {
    const onStability = (e: any) => {
      if (e.type === 'stability_changed') setIsStable(e.state.isStable);
    };
    const onReadiness = (e: any) => {
      if (e.type === 'auto_capture_ready') setReadiness(e.readiness);
    };
    const onReady = (e: any) => {
      if (e.type === 'capture_ready') setEnabled(false);
    };

    engine.addListener(onStability);
    engine.addListener(onReadiness);
    engine.addListener(onReady);

    return () => {
      engine.stop();
      setEnabled(false);
      setIsStable(false);
    };
  }, [engine]);

  const start = useCallback(() => {
    setEnabled(true);
    engine.start();
  }, [engine]);

  const stop = useCallback(() => {
    setEnabled(false);
    engine.stop();
    setIsStable(false);
  }, [engine]);

  const toggle = useCallback(() => {
    if (enabled) stop(); else start();
  }, [enabled, start, stop]);

  const triggerFeedback = useCallback(() => {
    engine.triggerFeedback();
  }, [engine]);

  const updateEdgeConfidence = useCallback((confidence: number) => {
    engine.updateEdgeConfidence(confidence);
  }, [engine]);

  return { enabled, isStable, readiness, start, stop, toggle, triggerFeedback, updateEdgeConfidence, engine };
}
