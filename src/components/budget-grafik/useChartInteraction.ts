/**
 * Aylik chart icindeki pan + spring tooltip + haptik etkilesim hook'u (#71, #72).
 *
 * Donen:
 *  - panResponder: chart wrapper'a baglamak icin
 *  - tooltipStyle / crosshairStyle: animasyonlu stil
 *  - chartLayoutHandlers.onLayout: onLayout callback ki chart genisligi olculsun
 *  - isPanning: bar dim efekti tetikler
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder } from 'react-native';
import { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface Args {
  onMonthChange: (monat: number) => void;
}

export function useChartInteraction({ onMonthChange }: Args) {
  const [isPanning, setIsPanning] = useState(false);

  const tooltipXSV    = useSharedValue(-100);
  const tooltipOpSV   = useSharedValue(0);
  const chartWidthRef = useRef(0);
  const chartLeftRef  = useRef(0);

  const lastHapticMonat  = useRef(-1);
  const lastHapticTimeMs = useRef(0);

  const tooltipStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: Math.max(0, Math.min(tooltipXSV.value - 36, chartWidthRef.current - 72)),
    }],
    opacity: tooltipOpSV.value,
  }));
  const crosshairStyle = useAnimatedStyle(() => ({
    left:    tooltipXSV.value - 0.75,
    opacity: tooltipOpSV.value,
  }));

  const handleChartMove = useCallback((pageX: number) => {
    if (chartWidthRef.current <= 0) return;
    const relX   = pageX - chartLeftRef.current;
    const colW   = chartWidthRef.current / 12;
    const barIdx = Math.max(0, Math.min(11, Math.floor(relX / colW)));
    const monat  = barIdx + 1;

    tooltipXSV.value  = withSpring(barIdx * colW + colW / 2, { damping: 22, stiffness: 300, mass: 0.5 });
    tooltipOpSV.value = withTiming(1, { duration: 80 });

    if (monat !== lastHapticMonat.current) {
      lastHapticMonat.current = monat;
      onMonthChange(monat);
      const now = Date.now();
      if (now - lastHapticTimeMs.current > 80) {
        lastHapticTimeMs.current = now;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [onMonthChange]); // eslint-disable-line react-hooks/exhaustive-deps

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: e => {
      setIsPanning(true);
      handleChartMove(e.nativeEvent.pageX);
    },
    onPanResponderMove: e => {
      handleChartMove(e.nativeEvent.pageX);
    },
    onPanResponderRelease: () => {
      setIsPanning(false);
      tooltipOpSV.value = withTiming(0, { duration: 150 });
      lastHapticMonat.current = -1;
    },
    onPanResponderTerminate: () => {
      setIsPanning(false);
      tooltipOpSV.value = withTiming(0, { duration: 150 });
      lastHapticMonat.current = -1;
    },
  }), [handleChartMove]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChartLayout = useCallback((e: any) => {
    const w = e.nativeEvent.layout.width;
    chartWidthRef.current = w;
    e.target.measure((_x: number, _y: number, _w: number, _h: number, px: number) => {
      chartLeftRef.current = px;
    });
  }, []);

  return {
    panResponder,
    tooltipStyle,
    crosshairStyle,
    onChartLayout,
    isPanning,
  };
}
