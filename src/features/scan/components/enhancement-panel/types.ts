/** Bearbeitungs-Panel unter dem Schnittbildschirm */

export interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ManualAdjustments {
  brightness: number;
  contrast: number;
  clarity: number;
  shadowRemoval: number;
}

export interface EnhancementPanelProps {
  presets: FilterPreset[];
  activeFilter: string;
  qualityScore?: number;
  processing: boolean;
  isDirty: boolean;
  adjustments?: ManualAdjustments;
  onSelectPreset: (id: string) => void;
  onAdjustmentsChange?: (adj: ManualAdjustments) => void;
  onApply: () => void;
}

export const DEFAULT_ADJUSTMENTS: ManualAdjustments = {
  brightness: 0,
  contrast: 0,
  clarity: 0,
  shadowRemoval: 0,
};
