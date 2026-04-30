import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';

// Skia neon glow — #78
let SkCanvas: any = null, SkRect: any = null, SkBlurMask: any = null;
try {
  const S = require('@shopify/react-native-skia');
  SkCanvas = S.Canvas;
  SkRect = S.Rect;
  SkBlurMask = S.BlurMask;
} catch {
  /* optional */
}
export const SKIA_GLOW_AVAILABLE = SkCanvas !== null;

interface Props {
  show: boolean;
  pulseStyle?: AnimatedStyle<ViewStyle>;
  statusColor: string;
}

/** Pulsing halo behind budget card when target status is kritisch — Skia or shadow fallback */
export function CriticalGlowLayers({ show, pulseStyle, statusColor }: Props) {
  if (!show) return null;

  if (SKIA_GLOW_AVAILABLE) {
    return (
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { margin: -16, borderRadius: 30 }, pulseStyle]}
      >
        <SkCanvas style={{ flex: 1 }}>
          <SkRect x={16} y={16} width={0} height={0} color="transparent">
            <SkBlurMask blur={22} style="normal" />
          </SkRect>
        </SkCanvas>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          margin: -10,
          borderRadius: 28,
          backgroundColor: `${statusColor}18`,
          shadowColor: statusColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.65,
          shadowRadius: 22,
          elevation: 12,
        },
        pulseStyle,
      ]}
    />
  );
}
