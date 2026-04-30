import { BasePresetFilter } from '@/modules/image-processing/presets/base';
import { getSharedFilterPipeline } from '@/modules/image-processing/engine/FilterPipeline';
import { hasNativeMotor } from '@/modules/scanner/engine/NativeStub';
import { applyManualAdjustments } from '@/modules/image-processing/engine/SkiaManualAdjuster';
import { MANUAL_PRESETS } from '@/modules/image-processing/engine/SkiaManualAdjuster.values';

export class BWFilter extends BasePresetFilter {
  id = 'bw';
  name = 'S/W';
  icon = 'contrast-outline';

  async apply(imageUri: string): Promise<string> {
    await this.validateImage(imageUri);
    try {
      // Prefer the native motor when present (faster, sensor-aware path).
      if (hasNativeMotor()) {
        return await getSharedFilterPipeline().apply(imageUri, this.id);
      }
      // JS path: real grayscale + contrast via Skia shader (no quality loss).
      return await applyManualAdjustments(imageUri, MANUAL_PRESETS.bw);
    } catch (e) {
      this.handleError('apply', e);
    }
  }
}
