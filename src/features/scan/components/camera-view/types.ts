import type { RefObject } from 'react';
import type { CameraView as ExpoCameraView } from 'expo-camera';
import type { BatchPage } from '@/modules/batch/types';
import type { DocumentCorners, AutoCaptureReadiness } from '@/modules/scanner/types';

export type { BatchPage };

export interface StabilityState {
  isStable: boolean;
  confidence: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface CameraViewProps {
  cameraRef: RefObject<ExpoCameraView>;
  hasPermission: boolean;
  onRequestPermission: () => void;
  onOpenGallery?: () => void;

  stability: StabilityState;

  isCapturing: boolean;
  onCapture: () => void;

  pageCount: number;
  pages: BatchPage[];
  onBatchPress: () => void;
  onRemovePage: (id: string) => void;
  onOpenPageEditor: (id: string) => void;

  insets: { top: number; bottom: number };
  onClose: () => void;
  detectedCorners?: DocumentCorners | null;
  edgesAreFresh?: boolean;
  distanceHint?: 'closer' | 'farther' | 'perfect' | null;
  /** Auto-Capture Countdown-Daten — zeigt Fortschrittsanzeige vor Auslösung */
  autoCaptureReadiness?: AutoCaptureReadiness;
  /** Unterscheidet manuell vs. automatisch ausgelöste Aufnahmen im Feedback */
  lastCaptureSource?: 'manual' | 'auto';
}
