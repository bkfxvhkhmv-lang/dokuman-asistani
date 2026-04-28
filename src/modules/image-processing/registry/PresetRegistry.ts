import type { ImageFilter } from '../types';
import { getSharedFilterRegistry } from './FilterRegistry';

export interface FilterPresetOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const ORIGINAL_PRESET: FilterPresetOption = {
  id: 'original',
  name: 'Original',
  icon: 'image-outline',
  color: '#9CA3AF',
};

function buildFilterPresetOptions(filters: ImageFilter[]): FilterPresetOption[] {
  return [
    ORIGINAL_PRESET,
    ...filters.map(filter => ({
      id: filter.id,
      name: filter.name,
      icon: filter.icon || 'image-outline',
      color: '#7C6EF8',
    })),
  ];
}

export class PresetRegistry {
  getPresets(): FilterPresetOption[] {
    return buildFilterPresetOptions(getSharedFilterRegistry().getFilters());
  }
}

let sharedPresetRegistry: PresetRegistry | null = null;

export function getSharedPresetRegistry() {
  if (!sharedPresetRegistry) {
    sharedPresetRegistry = new PresetRegistry();
  }
  return sharedPresetRegistry;
}
