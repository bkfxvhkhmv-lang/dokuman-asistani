import { useFrameProcessor } from 'react-native-vision-camera';
import type { Frame } from 'react-native-vision-camera';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { useCallback, useRef } from 'react';
import type { DocumentCorners } from '../types';
import { VisionCameraProxy } from 'react-native-vision-camera';

// ── Native plugin interface ───────────────────────────────────────────────────
// When a real OpenCV/CoreImage plugin is linked, it registers under this key.
const EDGE_PLUGIN_KEY = 'briefpilot_edge_detector';

let _edgePlugin: ReturnType<typeof VisionCameraProxy.initFrameProcessorPlugin> | null = null;
try {
  _edgePlugin = VisionCameraProxy.initFrameProcessorPlugin(EDGE_PLUGIN_KEY, {});
} catch {
  // Plugin not linked — JS fallback will be used
}

// ── Frame-level quality heuristics (runs as Reanimated worklet) ───────────────

function estimateFrameQuality(frame: Frame): {
  brightness: number;  // 0–1
  blur: number;        // 0–1
  aspectConfidence: number; // 0–1 (how A4-like is the frame)
} {
  'worklet';
  const { width, height } = frame;
  const aspectRatio = height / width;
  const a4Ratio = 1.414;
  const letterRatio = 1.294;
  const bestDist = Math.min(
    Math.abs(aspectRatio - a4Ratio) / a4Ratio,
    Math.abs(aspectRatio - letterRatio) / letterRatio,
  );
  const aspectConfidence = Math.max(0.3, 1 - bestDist * 2.5);

  // File size proxy: higher-resolution frames typically contain more data
  const megapixels = (width * height) / 1_000_000;
  const blur = Math.min(1, Math.max(0.3, megapixels / 8));
  const brightness = 0.85; // Can't measure brightness without pixel access in JS worklet

  return { brightness, blur, aspectConfidence };
}

// ── Bridge types ─────────────────────────────────────────────────────────────

export interface FrameScanResult {
  corners: DocumentCorners | null;
  quality: { brightness: number; blur: number; aspectConfidence: number };
  fromNative: boolean;
}

export interface FrameProcessorBridgeOptions {
  fps?: number;         // Target analysis FPS (default 2 — saves CPU)
  minConfidence?: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFrameProcessorBridge(
  onResult: (result: FrameScanResult) => void,
  options: FrameProcessorBridgeOptions = {},
) {
  const { fps = 2, minConfidence = 0.3 } = options;
  const intervalMs = 1000 / fps;
  const lastProcessed = useSharedValue(0);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const dispatchResult = useCallback((result: FrameScanResult) => {
    onResultRef.current(result);
  }, []);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const now = Date.now();
    if (now - lastProcessed.value < intervalMs) return;
    lastProcessed.value = now;

    const quality = estimateFrameQuality(frame);
    let corners: DocumentCorners | null = null;
    let fromNative = false;

    if (_edgePlugin) {
      try {
        const result = _edgePlugin.call(frame) as unknown as DocumentCorners | null;
        if (result && result.confidence >= minConfidence) {
          corners = result;
          fromNative = true;
        }
      } catch {
        // Native plugin failed — fall through to JS result
      }
    }

    // If no native corners, synthesize from quality heuristics for AutoCapture scoring
    if (!corners && quality.aspectConfidence >= minConfidence) {
      const inset = 0.05;
      corners = {
        topLeft:     { x: inset,       y: inset },
        topRight:    { x: 1 - inset,   y: inset },
        bottomRight: { x: 1 - inset,   y: 1 - inset },
        bottomLeft:  { x: inset,       y: 1 - inset },
        confidence:  quality.aspectConfidence * 0.7,
      };
    }

    runOnJS(dispatchResult)({ corners, quality, fromNative });
  }, [lastProcessed, intervalMs, minConfidence, dispatchResult]);

  return { frameProcessor };
}
