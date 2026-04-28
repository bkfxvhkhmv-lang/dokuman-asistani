import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { CropBox, CropImageSize, CropPixelRect } from '../types';

export interface CropLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_PADDING = 30;
const MIN_CROP_SIZE = 80;

export class CropEngine {
  createInitialBox(layout: CropLayout, padding = DEFAULT_PADDING): CropBox {
    return {
      x: layout.x + padding,
      y: layout.y + padding,
      w: Math.max(MIN_CROP_SIZE, layout.width - padding * 2),
      h: Math.max(MIN_CROP_SIZE, layout.height - padding * 2),
    };
  }

  updateCorner(box: CropBox, layout: CropLayout, corner: 'TL' | 'TR' | 'BL' | 'BR', dx: number, dy: number): CropBox {
    let { x, y, w, h } = box;
    if (corner === 'TL') {
      const nx = this.clamp(x + dx, layout.x, x + w - MIN_CROP_SIZE);
      const ny = this.clamp(y + dy, layout.y, y + h - MIN_CROP_SIZE);
      return { x: nx, y: ny, w: w + (x - nx), h: h + (y - ny) };
    }
    if (corner === 'TR') {
      const ny = this.clamp(y + dy, layout.y, y + h - MIN_CROP_SIZE);
      const newW = Math.max(MIN_CROP_SIZE, Math.min(layout.x + layout.width - x, w + dx));
      return { x, y: ny, w: newW, h: h + (y - ny) };
    }
    if (corner === 'BL') {
      const nx = this.clamp(x + dx, layout.x, x + w - MIN_CROP_SIZE);
      const newH = Math.max(MIN_CROP_SIZE, Math.min(layout.y + layout.height - y, h + dy));
      return { x: nx, y, w: w + (x - nx), h: newH };
    }
    const newW = Math.max(MIN_CROP_SIZE, Math.min(layout.x + layout.width - x, w + dx));
    const newH = Math.max(MIN_CROP_SIZE, Math.min(layout.y + layout.height - y, h + dy));
    return { x, y, w: newW, h: newH };
  }

  getPixelCropRect(box: CropBox, layout: CropLayout, imageSize: CropImageSize): CropPixelRect {
    const scaleX = imageSize.w / layout.width;
    const scaleY = imageSize.h / layout.height;
    const relX = Math.max(0, box.x - layout.x);
    const relY = Math.max(0, box.y - layout.y);
    const cropW = Math.min(box.w, layout.width - relX);
    const cropH = Math.min(box.h, layout.height - relY);
    return {
      originX: Math.round(relX * scaleX),
      originY: Math.round(relY * scaleY),
      width: Math.round(cropW * scaleX),
      height: Math.round(cropH * scaleY),
    };
  }

  async manualCrop(uri: string, box: CropBox, layout: CropLayout, imageSize: CropImageSize): Promise<string> {
    const crop = this.getPixelCropRect(box, layout, imageSize);
    const result = await manipulateAsync(uri, [{ crop }], { compress: 0.92, format: SaveFormat.JPEG });
    return result.uri;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }
}

let sharedCropEngine: CropEngine | null = null;

export function getSharedCropEngine() {
  if (!sharedCropEngine) {
    sharedCropEngine = new CropEngine();
  }
  return sharedCropEngine;
}
