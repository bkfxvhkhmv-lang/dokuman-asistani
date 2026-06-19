import type { ScannedAsset } from '@/features/ocr-mvp/scanner/types';

let pendingSharedAsset: ScannedAsset | null = null;
const listeners = new Set<(asset: ScannedAsset) => void>();

export function setPendingSharedAsset(asset: ScannedAsset): void {
  pendingSharedAsset = asset;
  listeners.forEach((listener) => listener(asset));
}

export function consumePendingSharedAsset(): ScannedAsset | null {
  const asset = pendingSharedAsset;
  pendingSharedAsset = null;
  return asset;
}

export function subscribePendingSharedAsset(
  listener: (asset: ScannedAsset) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
