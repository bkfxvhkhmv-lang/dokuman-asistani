import { requireNativeComponent, type ViewStyle } from 'react-native';

export interface LiveScannerViewProps {
  style?: ViewStyle;
  flash?: 'on' | 'off';
  zoom?: number;
  active?: boolean;
}

export const LiveScannerView = requireNativeComponent<LiveScannerViewProps>(
  'BriefPilotLiveScannerViewManager',
);
