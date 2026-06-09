import type { ManualAdjustValues } from '@/modules/image-processing/engine/SkiaManualAdjuster.values';
import type { ImageSession } from '@/modules/image-processing';

export interface EditViewProps {
  session: ImageSession;
  isOptimizing: boolean;
  compareUri?: string | null;
  onAcceptOptimize?: () => void;
  onRevertOptimize?: () => void;
  onBack: () => void;
  onDone?: () => void;
  onStartCrop: () => void;
  onOptimize: () => void;
  onRotate: () => void;
  onCropConfirm: (croppedUri: string) => void;
  onCropConfirmAndAnalyze: (croppedUri: string) => void;
  onCropCancel: () => void;
  onManualAdjust?: (committedUri: string, values: ManualAdjustValues) => void;
}
