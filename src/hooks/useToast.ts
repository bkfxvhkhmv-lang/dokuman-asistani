import { useState, useCallback, useRef } from 'react';

export type ToastTone = 'success' | 'warning' | 'danger' | 'info';

export interface ToastConfig {
  message: string;
  tone?:     ToastTone;
  icon?:     string;    // Ionicons name
  duration?: number;    // ms, default 2600
}

export function useToast() {
  const [config, setConfig] = useState<ToastConfig | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((cfg: ToastConfig) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfig(cfg);
    timerRef.current = setTimeout(() => setConfig(null), cfg.duration ?? 2600);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setConfig(null);
  }, []);

  return { config, show, hide };
}
