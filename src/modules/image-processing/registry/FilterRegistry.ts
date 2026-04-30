import { CleanFilter } from '@/modules/image-processing/presets/clean';
import { BWFilter } from '@/modules/image-processing/presets/bw';
import { MagicFilter } from '@/modules/image-processing/presets/magic';
import { ColorFilter } from '@/modules/image-processing/presets/color';
import type { ImageFilter } from '@/modules/image-processing/types';

export class FilterRegistry {
  getFilters(): ImageFilter[] {
    return [
      new CleanFilter(),
      new BWFilter(),
      new MagicFilter(),
      new ColorFilter(),
    ];
  }
}

let sharedFilterRegistry: FilterRegistry | null = null;

export function getSharedFilterRegistry() {
  if (!sharedFilterRegistry) {
    sharedFilterRegistry = new FilterRegistry();
  }
  return sharedFilterRegistry;
}
