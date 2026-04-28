import { useState, useCallback } from 'react';

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
      actions: [{ label: 'OK', variant: 'primary', onPress: () => setConfig(null) }],
    });
  }, []);

  const confirm = useCallback(({
    title,
    message,
    icon = 'alert-circle',
    tone = 'warning' as const,
    cancelLabel = 'Abbrechen',
    confirmLabel = 'Bestätigen',
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
  }, []);

  return { config, showSheet, hideSheet, alert, confirm };
}
