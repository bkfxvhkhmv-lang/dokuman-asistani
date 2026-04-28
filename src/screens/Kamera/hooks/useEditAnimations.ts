import { useRef, useCallback, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import type { ImageEditMode } from '../../../modules/image-processing/types';

export interface EditAnimations {
  // Panel slide+fade (filter/enhance panels)
  panelOpacity: Animated.Value;
  panelTranslateY: Animated.Value;
  // Image cross-fade (A/B swap on filter change)
  imageOpacityA: Animated.Value;
  imageOpacityB: Animated.Value;
  // Rotate hint spin
  rotateSpin: Animated.Value;
  // Header opacity (fade in on mount)
  headerOpacity: Animated.Value;
  // Mode indicator pulse
  modeIndicatorScale: Animated.Value;

  triggerPanelIn: () => void;
  triggerPanelOut: (onDone?: () => void) => void;
  triggerImageFade: (slot: 'A' | 'B', onMid?: () => void) => void;
  triggerRotateHint: () => void;
  triggerModeChange: () => void;
}

const PANEL_DURATION = 220;
const FADE_DURATION  = 180;

export function useEditAnimations(mode: ImageEditMode): EditAnimations {
  const panelOpacity     = useRef(new Animated.Value(0)).current;
  const panelTranslateY  = useRef(new Animated.Value(24)).current;
  const imageOpacityA    = useRef(new Animated.Value(1)).current;
  const imageOpacityB    = useRef(new Animated.Value(0)).current;
  const rotateSpin       = useRef(new Animated.Value(0)).current;
  const headerOpacity    = useRef(new Animated.Value(0)).current;
  const modeIndicatorScale = useRef(new Animated.Value(1)).current;

  // Fade in header on mount
  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1, duration: 280, useNativeDriver: true,
    }).start();
  }, []);

  // Animate panel in/out on mode change
  useEffect(() => {
    const showsPanel = mode === 'filter-preview' || mode === 'filter-commit' || mode === 'enhance';
    if (showsPanel) {
      panelOpacity.setValue(0);
      panelTranslateY.setValue(20);
      Animated.parallel([
        Animated.timing(panelOpacity, { toValue: 1, duration: PANEL_DURATION, useNativeDriver: true }),
        Animated.spring(panelTranslateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
      ]).start();
    }
  }, [mode]);

  const triggerPanelIn = useCallback(() => {
    panelOpacity.setValue(0);
    panelTranslateY.setValue(20);
    Animated.parallel([
      Animated.timing(panelOpacity, { toValue: 1, duration: PANEL_DURATION, useNativeDriver: true }),
      Animated.spring(panelTranslateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
    ]).start();
  }, [panelOpacity, panelTranslateY]);

  const triggerPanelOut = useCallback((onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(panelOpacity, { toValue: 0, duration: PANEL_DURATION - 40, useNativeDriver: true }),
      Animated.timing(panelTranslateY, { toValue: 16, duration: PANEL_DURATION - 40, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, [panelOpacity, panelTranslateY]);

  // Cross-fade: fade out slot A, call onMid to swap uri, fade back in
  const triggerImageFade = useCallback((slot: 'A' | 'B', onMid?: () => void) => {
    const fadeOut = slot === 'A' ? imageOpacityA : imageOpacityB;
    const fadeIn  = slot === 'A' ? imageOpacityB : imageOpacityA;

    Animated.timing(fadeOut, { toValue: 0.4, duration: FADE_DURATION, useNativeDriver: true }).start(() => {
      onMid?.();
      Animated.timing(fadeOut, { toValue: 1, duration: FADE_DURATION, useNativeDriver: true }).start();
    });
  }, [imageOpacityA, imageOpacityB]);

  const triggerRotateHint = useCallback(() => {
    rotateSpin.setValue(0);
    Animated.sequence([
      Animated.timing(rotateSpin, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rotateSpin, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start();
  }, [rotateSpin]);

  const triggerModeChange = useCallback(() => {
    modeIndicatorScale.setValue(1);
    Animated.sequence([
      Animated.spring(modeIndicatorScale, { toValue: 1.08, useNativeDriver: true, damping: 12, stiffness: 300 }),
      Animated.spring(modeIndicatorScale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }),
    ]).start();
  }, [modeIndicatorScale]);

  return {
    panelOpacity,
    panelTranslateY,
    imageOpacityA,
    imageOpacityB,
    rotateSpin,
    headerOpacity,
    modeIndicatorScale,
    triggerPanelIn,
    triggerPanelOut,
    triggerImageFade,
    triggerRotateHint,
    triggerModeChange,
  };
}
