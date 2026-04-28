import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

interface Deps {
  capture: () => Promise<any>;
  isCapturing: boolean;
  prepareCapture: (opts: { uri: string; width: number; height: number; filter: string }) => Promise<{ accepted: boolean; reason?: string }>;
  activeFilter: string;
  showSheet: (cfg: any) => void;
  hideSheet: () => void;
  confirmSheet: (cfg: any) => Promise<boolean>;
  clearPages: () => void;
}

export function useCameraHandler({
  capture, isCapturing, prepareCapture, activeFilter, showSheet, hideSheet, confirmSheet, clearPages,
}: Deps) {
  const handleCapture = useCallback(async () => {
    if (isCapturing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await capture();
      if (!result) {
        showSheet({ title: 'Fehler', message: 'Aufnahme fehlgeschlagen', icon: 'alert-circle', tone: 'danger', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
        return;
      }
      if (!result.qualityMetrics && result.originalUri) {
        const prepared = await prepareCapture({ uri: result.originalUri, width: result.width, height: result.height, filter: activeFilter });
        if (!prepared.accepted) {
          showSheet({ title: 'Geringe Scanqualität', message: prepared.reason || 'Scanqualität unzureichend.', icon: 'alert-circle', tone: 'warning', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
        }
      }
    } catch {
      showSheet({ title: 'Fehler', message: 'Aufnahme fehlgeschlagen', icon: 'alert-circle', tone: 'danger', actions: [{ label: 'OK', variant: 'primary', onPress: hideSheet }] });
    }
  }, [isCapturing, capture, prepareCapture, activeFilter, showSheet, hideSheet]);

  const handleClearAll = useCallback(async () => {
    const ok = await confirmSheet({
      title: 'Alle Seiten löschen',
      message: 'Sind Sie sicher?',
      icon: 'trash',
      tone: 'danger',
      cancelLabel: 'Abbrechen',
      confirmLabel: 'Löschen',
      dangerConfirm: true,
    });
    if (ok) clearPages();
  }, [confirmSheet, clearPages]);

  return { handleCapture, handleClearAll };
}
