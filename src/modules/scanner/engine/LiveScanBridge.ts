import { requireOptionalNativeModule } from 'expo-modules-core';
import type { DocumentCorners } from '@/modules/scanner/types';

const LiveScanNative = requireOptionalNativeModule<{
  takePhoto: () => Promise<{ uri: string; width: number; height: number }>;
  addListener: (
    eventName: 'onLiveScanResult',
    listener: (payload: Record<string, unknown>) => void,
  ) => { remove(): void };
}>('BriefPilotLiveScanner');

export type LiveScanPayload = {
  corners: DocumentCorners;
  /** Native buffer width as emitted by the live scanner output connection. */
  bufferW: number;
  /** Native buffer height as emitted by the live scanner output connection. */
  bufferH: number;
};

export type LiveScanHandler = (payload: LiveScanPayload) => void;

function parsePayload(raw: Record<string, unknown>): LiveScanPayload | null {
  const tl = raw.topLeft as any;
  const tr = raw.topRight as any;
  const br = raw.bottomRight as any;
  const bl = raw.bottomLeft as any;

  if (!tl || !tr || !br || !bl) return null;

  return {
    corners: {
      topLeft:     { x: tl.x, y: tl.y },
      topRight:    { x: tr.x, y: tr.y },
      bottomRight: { x: br.x, y: br.y },
      bottomLeft:  { x: bl.x, y: bl.y },
      confidence:       raw.confidence as number,
      areaScore:        raw.areaScore as number | undefined,
      angleScore:       raw.angleScore as number | undefined,
      aspectScore:      raw.aspectScore as number | undefined,
      centerScore:      raw.centerScore as number | undefined,
      edgeSupportScore: raw.edgeSupportScore as number | undefined,
    },
    bufferW: (raw.width as number) ?? 1920,
    bufferH: (raw.height as number) ?? 1080,
  };
}

export class LiveScanBridge {
  private subscription: { remove(): void } | null = null;

  get isAvailable(): boolean {
    return LiveScanNative !== null && LiveScanNative !== undefined;
  }

  start(onResult: LiveScanHandler): void {
    this.stop();
    if (!LiveScanNative) return;

    this.subscription = LiveScanNative.addListener('onLiveScanResult', (raw) => {
      const payload = parsePayload(raw);
      if (payload) onResult(payload);
    });
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
  }

  takePhoto(): Promise<{ uri: string; width: number; height: number }> | null {
    return LiveScanNative ? LiveScanNative.takePhoto() : null;
  }
}
