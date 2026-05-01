import type { PostCaptureAction } from '@/features/scan/components/post-capture-sheet/types';

export const SHEET_CYAN  = '#00C8FF';
export const SHEET_NAVY  = '#0D1117';

export interface SecondaryActionDef {
  id: Extract<PostCaptureAction, 'add_page' | 'edit'>;
  icon: string;
  color: string;
}

/** MVP: show only multi-page and edit options — export/archive/advanced live in the detail screen. */
export const SECONDARY_ACTIONS: SecondaryActionDef[] = [
  { id: 'add_page', icon: 'add-circle-outline', color: '#94A3B8' },
  { id: 'edit',     icon: 'create-outline',     color: '#94A3B8' },
];
