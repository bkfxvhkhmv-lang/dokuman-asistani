import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';

interface UseDetailScreenAnimationsResult {
  // Scroll
  scrollY:              Animated.Value;
  headerShadowOpacity:  Animated.AnimatedInterpolation<number>;
  headerBorderOpacity:  Animated.AnimatedInterpolation<number>;
  heroParallaxY:        Animated.AnimatedInterpolation<number>;  // #44
  headerProgress:       Animated.Value;          // 0–1, drives progress bar width
  onTabScroll:          ReturnType<typeof Animated.event>;
  onScrollContentSize:  (w: number, h: number) => void;
  onScrollLayout:       (e: { nativeEvent: { layout: { height: number } } }) => void;
  // Mount
  mountOpacity: Animated.Value;
  mountScale:   Animated.Value;
  // Tab crossfade
  tabOpacity:     Animated.Value;
  tabScale:       Animated.Value;
  aktifTab:       string;
  handleTabPress: (tabId: string) => void;
  // Swipe-to-back
  swipeX:       Animated.Value;
  panResponder: ReturnType<typeof PanResponder.create>;
  // Back handler
  handleBack: (onBack: () => void) => void;
}

export function useDetailScreenAnimations(initialTab = 'ozet'): UseDetailScreenAnimationsResult {
  const [aktifTab, setAktifTab] = useState(initialTab);

  // ── Scroll-linked header ──────────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerShadowOpacity = scrollY.interpolate({
    inputRange: [0, 24], outputRange: [0, 1], extrapolate: 'clamp',
  });
  const headerBorderOpacity = scrollY.interpolate({
    inputRange: [0, 16], outputRange: [0, 1], extrapolate: 'clamp',
  });
  // #44 Parallax — hero section moves at 0.4× scroll speed
  const heroParallaxY = scrollY.interpolate({
    inputRange: [0, 200], outputRange: [0, -80], extrapolate: 'clamp',
  });
  const onTabScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false },
  );

  // ── Scroll progress bar ───────────────────────────────────────────────────
  const headerProgress = useRef(new Animated.Value(0)).current;
  const contentH   = useRef(0);
  const containerH = useRef(0);

  const onScrollContentSize = useCallback((_: number, h: number) => {
    contentH.current = h;
  }, []);

  const onScrollLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    containerH.current = e.nativeEvent.layout.height;
  }, []);

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const max = Math.max(1, contentH.current - containerH.current);
      headerProgress.setValue(Math.min(1, Math.max(0, value / max)));
    });
    return () => scrollY.removeListener(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount / exit ──────────────────────────────────────────────────────────
  const mountOpacity = useRef(new Animated.Value(0)).current;
  const mountScale   = useRef(new Animated.Value(0.93)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(mountScale,   { toValue: 1, damping: 22, stiffness: 260, mass: 0.8, useNativeDriver: true }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = (onBack: () => void) => {
    Animated.parallel([
      Animated.timing(mountOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(mountScale,   { toValue: 0.93, damping: 22, stiffness: 260, mass: 0.8, useNativeDriver: true }),
    ]).start(onBack);
  };

  // ── Tab crossfade + scale ─────────────────────────────────────────────────
  const tabOpacity = useRef(new Animated.Value(1)).current;
  const tabScale   = useRef(new Animated.Value(1)).current;

  const handleTabPress = (tabId: string) => {
    if (tabId === aktifTab) return;
    // Reset progress bar on tab switch (new tab starts at top)
    headerProgress.setValue(0);
    scrollY.setValue(0);

    Animated.parallel([
      Animated.timing(tabOpacity, { toValue: 0, duration: 70,  useNativeDriver: true }),
      Animated.spring(tabScale,   { toValue: 0.97, damping: 20, stiffness: 300, mass: 0.6, useNativeDriver: true }),
    ]).start(() => {
      setAktifTab(tabId);
      Animated.parallel([
        Animated.timing(tabOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(tabScale,   { toValue: 1, damping: 18, stiffness: 240, mass: 0.7, useNativeDriver: true }),
      ]).start();
    });
  };

  // ── Swipe-to-back gesture ─────────────────────────────────────────────────
  const swipeX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dx > 12 && Math.abs(g.dy) < Math.abs(g.dx) * 0.65 && g.x0 < 50,
      onPanResponderMove: (_, g) => { if (g.dx > 0) swipeX.setValue(g.dx); },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 100 || g.vx > 0.7) {
          Animated.timing(swipeX, { toValue: 420, duration: 180, useNativeDriver: true }).start();
        } else {
          Animated.spring(swipeX, { toValue: 0, damping: 22, stiffness: 300, mass: 0.9, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, damping: 22, stiffness: 300, mass: 0.9, useNativeDriver: true }).start();
      },
    })
  ).current;

  return {
    scrollY, headerShadowOpacity, headerBorderOpacity, heroParallaxY, headerProgress,
    onTabScroll, onScrollContentSize, onScrollLayout,
    mountOpacity, mountScale, handleBack,
    tabOpacity, tabScale, aktifTab, handleTabPress,
    swipeX, panResponder,
  };
}
