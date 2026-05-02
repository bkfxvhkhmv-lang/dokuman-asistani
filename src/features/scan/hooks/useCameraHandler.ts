import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useT } from '@/hooks/useT';

function describeCaptureError(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return String(e);
}

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
  const { t } = useT();

  const handleCapture = useCallback(async () => {
    if (isCapturing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const captureTitle = t('scan.camera.capture_title');
    const captureBody  = t('scan.camera.capture_body');
    try {
      const result = await capture();
      if (!result) {
        if (__DEV__) console.warn('[Camera] capture returned null — Capture-Timeout oder fehlende Ref. Metro-Log prüfen.');
        showSheet({ title: captureTitle, message: captureBody, icon: 'alert-circle', tone: 'danger', actions: [{ label: t('common.ok'), variant: 'primary', onPress: hideSheet }] });
        return;
      }
      if (!result.qualityMetrics && result.originalUri) {
        const prepared = await prepareCapture({ uri: result.originalUri, width: result.width, height: result.height, filter: activeFilter });
        if (!prepared.accepted) {
          if (__DEV__) console.warn('[Camera] low quality:', prepared.reason);
          showSheet({ title: t('scan.camera.low_quality'), message: captureBody, icon: 'alert-circle', tone: 'warning', actions: [{ label: t('common.ok'), variant: 'primary', onPress: hideSheet }] });
        }
      }
    } catch (e) {
      if (__DEV__) console.error('[Camera] capture error:', describeCaptureError(e));
      showSheet({ title: captureTitle, message: captureBody, icon: 'alert-circle', tone: 'danger', actions: [{ label: t('common.ok'), variant: 'primary', onPress: hideSheet }] });
    }
  }, [isCapturing, capture, prepareCapture, activeFilter, showSheet, hideSheet, t]);

  const handleClearAll = useCallback(async () => {
    const ok = await confirmSheet({
      title: t('scan.camera.delete_all_title'),
      message: t('scan.camera.delete_all_confirm'),
      icon: 'trash',
      tone: 'danger',
      cancelLabel: t('common.cancel'),
      confirmLabel: t('common.delete'),
      dangerConfirm: true,
    });
    if (ok) clearPages();
  }, [confirmSheet, clearPages, t]);

  return { handleCapture, handleClearAll };
}
