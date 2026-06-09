/**
 * Auth ekraninda kullanilan ortak tipler.
 *
 * Sheet (BottomSheet) state'i hem login form hem reset modal
 * tarafindan kullanildigi icin merkezilestirildi.
 */

export type Tone = 'default' | 'success' | 'warning' | 'danger';

export interface LocalSheetAction {
  label: string;
  onPress?: () => void;
}

export interface SheetState {
  visible: boolean;
  title:   string;
  message: string;
  icon:    string;
  tone:    Tone;
  actions: LocalSheetAction[];
}
