import type { FieldConfidence } from '@/services/SmartAutoFillService';

export const CONFIDENCE_COLORS = {
  hoch:    { bg: '#EAF3DE', border: '#5DCAA5', text: '#1D6641', dot: '#1D9E75' },
  mittel:  { bg: '#FAEEDA', border: '#EF9F27', text: '#633806', dot: '#BA7517' },
  niedrig: { bg: '#FCEBEB', border: '#F09595', text: '#A32D2D', dot: '#E24B4A' },
  fehlt:   { bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280', dot: '#9CA3AF' },
} as const;

export const CONFIDENCE_LABEL: Record<FieldConfidence, string> = {
  hoch:    'Sicher',
  mittel:  'Wahrscheinlich',
  niedrig: 'Unsicher',
  fehlt:   'Nicht erkannt',
};
