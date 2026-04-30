import type { PostCaptureAction } from '@/features/scan/components/post-capture-sheet/types';

export const SHEET_CYAN  = '#00C8FF';
export const SHEET_NAVY  = '#0D1117';

export interface SecondaryActionDef {
  id: Extract<PostCaptureAction, 'archive' | 'export' | 'advanced'>;
  icon: string;
  color: string;
}

export const SECONDARY_ACTIONS: SecondaryActionDef[] = [
  { id: 'archive',  icon: 'archive',    color: '#34D399' },
  { id: 'export',   icon: 'share',      color: '#94A3B8' },
  { id: 'advanced', icon: 'construct',  color: '#60A5FA' },
];
