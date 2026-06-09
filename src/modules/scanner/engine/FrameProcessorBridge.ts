import { useCallback, useRef } from 'react';
import type { DocumentCorners } from '@/modules/scanner/types';

export interface FrameScanResult {
  corners: DocumentCorners | null;
  quality: { brightness: number; blur: number; aspectConfidence: number };
  fromNative: boolean;
}

export interface FrameProcessorBridgeOptions {
  fps?: number;
  minConfidence?: number;
}

export function useFrameProcessorBridge(
  onResult: (result: FrameScanResult) => void,
  _options: FrameProcessorBridgeOptions = {},
) {
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const frameProcessor = useCallback(() => {
    // Frame processor disabled — document scanning handled by VisionKit (iOS) / ML Kit (Android)
  }, []);

  return { frameProcessor };
}
