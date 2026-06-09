/**
 * Auth ekrani icin hafif sheet (uyari/bilgi modal) yonetim hook'u.
 *
 * `openSheet({ title, message, icon, tone, actions })` ile acilir;
 * her aksiyona tiklandiginda sheet otomatik kapanir, sonra orijinal
 * onPress (varsa) cagrilir.
 *
 * NEDEN BURADA?
 *  - Login + Reset modal ayni sheet API'sini paylasmali.
 *  - Sheet render'i AppBottomSheet ile yapilir, ama state burada.
 */
import { useCallback, useState } from 'react';
import type { LocalSheetAction, SheetState, Tone } from '@/features/auth/types';

const INITIAL: SheetState = {
  visible: false,
  title:   '',
  message: '',
  icon:    'information-circle-outline',
  tone:    'default',
  actions: [],
};

export interface UseAuthSheetResult {
  sheetState: SheetState;
  openSheet: (config: Partial<Omit<SheetState, 'actions'>> & { actions?: LocalSheetAction[] }) => void;
  closeSheet: () => void;
}

export function useAuthSheet(): UseAuthSheetResult {
  const [sheetState, setSheetState] = useState<SheetState>(INITIAL);

  const closeSheet = useCallback(() => {
    setSheetState(prev => ({ ...prev, visible: false }));
  }, []);

  const openSheet = useCallback<UseAuthSheetResult['openSheet']>(config => {
    setSheetState({
      visible: true,
      title:   config.title || '',
      message: config.message || '',
      icon:    config.icon || INITIAL.icon,
      tone:    (config.tone as Tone) || 'default',
      // Her aksiyon tiklaninca sheet'i otomatik kapat — UX kuralı.
      actions: (config.actions || []).map(action => ({
        ...action,
        onPress: () => {
          setSheetState(prev => ({ ...prev, visible: false }));
          action.onPress?.();
        },
      })),
    });
  }, []);

  return { sheetState, openSheet, closeSheet };
}
