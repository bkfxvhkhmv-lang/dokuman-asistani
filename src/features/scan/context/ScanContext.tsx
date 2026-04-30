import React, { createContext, useContext, useMemo } from 'react';

import type { ScanQualityPresetId } from '@/modules/scanner/flow/scanQualityProfiles';
import type { ScanMode } from '@/features/scan/hooks/useScanFlowController';

interface ScanContextValue {
  mode: ScanMode;
  autoCapture: boolean;
  toggleAutoCapture: () => void;
  flash: 'off' | 'on';
  toggleFlash: () => void;
  qualityPreset: ScanQualityPresetId;
  setQualityPreset: (preset: ScanQualityPresetId) => void;
  showActionPicker: boolean;
  openActionPicker: () => void;
  closeActionPicker: () => void;
}

const ScanContext = createContext<ScanContextValue | null>(null);

interface ScanProviderProps {
  value: ScanContextValue;
  children: React.ReactNode;
}

export function ScanProvider({ value, children }: ScanProviderProps) {
  const memoValue = useMemo(() => value, [value]);
  return <ScanContext.Provider value={memoValue}>{children}</ScanContext.Provider>;
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used inside ScanProvider');
  return ctx;
}
