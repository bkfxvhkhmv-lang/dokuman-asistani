import { useState, useCallback } from 'react';
import { getLangSync } from '@/i18n/langStore';
import { t } from '@/i18n/translations';

export interface SheetAction {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onPress: () => void;
}

export interface SheetConfig {
  title: string;
  message?: string;
  icon?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  actions?: SheetAction[];
}

export function useSheet() {
  const [config, setConfig] = useState<SheetConfig | null>(null);
  const LT = useCallback((key: string, vars?: Record<string, string | number>) => t(getLangSync(), key, vars), []);

  const showSheet = useCallback((sheetConfig: SheetConfig) => {
    setConfig(sheetConfig);
  }, []);

  const hideSheet = useCallback(() => {
    setConfig(null);
  }, []);

  const alert = useCallback((
    title: string,
    message?: string,
    opts?: { icon?: string; tone?: SheetConfig['tone'] }
  ) => {
    setConfig({
      title,
      message,
      icon: opts?.icon ?? 'information-circle',
      tone: opts?.tone ?? 'default',
      actions: [{ label: LT('common.ok'), variant: 'primary', onPress: () => setConfig(null) }],
    });
  }, [LT]);

  const confirm = useCallback(({
    title,
    message,
    icon = 'alert-circle',
    tone = 'warning' as const,
    cancelLabel = LT('common.cancel'),
    confirmLabel = LT('common.confirm'),
    dangerConfirm = false,
  }: {
    title: string;
    message?: string;
    icon?: string;
    tone?: SheetConfig['tone'];
    cancelLabel?: string;
    confirmLabel?: string;
    dangerConfirm?: boolean;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({
        title,
        message,
        icon,
        tone,
        actions: [
          {
            label: cancelLabel,
            variant: 'secondary',
            onPress: () => { setConfig(null); resolve(false); },
          },
          {
            label: confirmLabel,
            variant: dangerConfirm ? 'danger' : 'primary',
            onPress: () => { setConfig(null); resolve(true); },
          },
        ],
      });
    });
  }, [LT]);

  return { config, showSheet, hideSheet, alert, confirm };
}
