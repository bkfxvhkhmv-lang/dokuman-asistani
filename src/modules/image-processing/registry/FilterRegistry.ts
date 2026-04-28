import { CleanFilter } from '../presets/clean';
import { BWFilter } from '../presets/bw';
import { MagicFilter } from '../presets/magic';
import { ColorFilter } from '../presets/color';
import type { ImageFilter } from '../types';

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
