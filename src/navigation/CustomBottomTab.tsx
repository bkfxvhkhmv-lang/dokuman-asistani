import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withSequence,
} from 'react-native-reanimated';

// ── Skia BackdropBlur — Android full-glass (API 21+) ──────────────────────
let SkCanvas:       any = null;
let SkBackdropBlur: any = null;
let SkFill:         any = null;
let skRect_:        any = null;
let skRrect_:       any = null;
try {
  const S = require('@shopify/react-native-skia');
  SkCanvas       = S.Canvas;
  SkBackdropBlur = S.BackdropBlur;
  SkFill         = S.Fill;
  skRect_        = S.rect;
  skRrect_       = S.rrect;
} catch {}
const SKIA_OK = SkCanvas !== null && Platform.OS === 'android';

import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';
import type { ColorPalette } from '../theme';
import { getTabBarCollapsed, subscribeTabBarCollapsed } from './tabBarVisibility';

const PADDING_H = 10; // container paddingHorizontal
const AURA_W    = 48; // outer halo width
const AURA_CORE = 20; // inner glow width

type TabBarProps = { state: any; descriptors: any; navigation: any };

function resolveLabel(route: any, options: any) {
  if (typeof options.tabBarLabel === 'string') return options.tabBarLabel;
  if (typeof options.title       === 'string') return options.title;
  return route.name;
}

function isHiddenRoute(options: any) {
  return options?.href === null || options?.tabBarButton === null;
}

// ── Glass background — own overflow:hidden keeps blur clipped ──────────────
function GlassLayer({
  colors,
  tabSize,
}: {
  colors: ColorPalette;
  tabSize: { w: number; h: number };
}) {
  return (
    <View style={[StyleSheet.absoluteFill, st.glassClip]}>
      {Platform.OS === 'ios' ? (
        <>
          <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
        </>
      ) : (
        <>
          {SKIA_OK && tabSize.w > 0 && skRect_ && skRrect_ ? (
            <SkCanvas style={StyleSheet.absoluteFill} pointerEvents="none">
              <SkBackdropBlur
                blur={22}
                clip={skRrect_(skRect_(0, 0, tabSize.w, tabSize.h), 28, 28)}
              >
                <SkFill color="rgba(248,250,255,0.34)" />
              </SkBackdropBlur>
            </SkCanvas>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(250,251,255,0.82)' }]} />
          )}
          {/* Android primary tint */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `${colors.primary}0B` }]} />
          {/* Android top sheen */}
          <LinearGradient
            colors={['rgba(255,255,255,0.90)', 'rgba(255,255,255,0.0)']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { height: 18 }]}
            pointerEvents="none"
          />
        </>
      )}

      {/* Top highlight band — both platforms */}
      <LinearGradient
        colors={['rgba(255,255,255,0.72)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={st.topEdge}
        pointerEvents="none"
      />
      <View style={[st.topGlow, { backgroundColor: `${colors.primary}12` }]} />
    </View>
  );
}

// ── Sliding aura glow — single pill that travels between tab centres ────────
import type { SharedValue } from 'react-native-reanimated';

function AuraGlow({
  x,
  primaryColor,
}: {
  x: SharedValue<number>;
  primaryColor: string;
}) {
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - AURA_W / 2 }],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - AURA_CORE / 2 }],
  }));

  return (
    <>
      {/* Outer soft halo */}
      <Animated.View
        pointerEvents="none"
        style={[st.auraHalo, { backgroundColor: `${primaryColor}16` }, haloStyle]}
      />
      {/* Inner bright core — casts shadow on iOS/RN shadow, elevation on Android */}
      <Animated.View
        pointerEvents="none"
        style={[
          st.auraCore,
          {
            backgroundColor: `${primaryColor}26`,
            shadowColor: primaryColor,
            elevation: 6,
          },
          coreStyle,
        ]}
      />
    </>
  );
}

// ── Per-tab animated item ──────────────────────────────────────────────────
interface TabItemProps {
  route:              any;
  isFocused:          boolean;
  isScan:             boolean;
  options:            any;
  effectiveCollapsed: boolean;
  onPress:            () => void;
  onLongPress:        () => void;
}

function TabItem({
  route, isFocused, isScan, options, effectiveCollapsed,
  onPress, onLongPress,
}: TabItemProps) {
  const { Colors } = useTheme();
  const label = resolveLabel(route, options);
  const color = isFocused ? Colors.primary : Colors.textTertiary;

  const floatY = useSharedValue(0);
  const scale  = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      scale.value  = withSequence(
        withSpring(0.80, { damping: 10, stiffness: 340 }),
        withSpring(1,    { damping: 14, stiffness: 280 }),
      );
      floatY.value = isScan ? 0 : withSpring(-5, { damping: 14, stiffness: 260 });
    } else {
      floatY.value = withSpring(0, { damping: 14, stiffness: 260 });
    }
  }, [isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: scale.value }],
  }));

  const iconNode = options.tabBarIcon
    ? options.tabBarIcon({ focused: isFocused, color, size: isScan ? 24 : 20 })
    : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[st.item, isScan && st.scanItem]}
    >
      <Animated.View style={[st.iconWrap, isScan && st.scanWrap, iconAnim]}>
        {iconNode}
      </Animated.View>

      {!isScan ? (
        <>
          <Text
            style={[st.label, { color: isFocused ? Colors.primaryDark : Colors.textTertiary, opacity: effectiveCollapsed ? 0.82 : 1 }]}
            maxFontSizeMultiplier={1.0}
          >
            {label}
          </Text>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryMid]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[st.activePill, { opacity: isFocused ? 1 : 0 }]}
          />
        </>
      ) : (
        <Text
          style={[st.scanLabel, { color: isFocused ? Colors.primaryDark : Colors.textSecondary, opacity: effectiveCollapsed ? 0.82 : 1 }]}
          maxFontSizeMultiplier={1.0}
        >
          Scan
        </Text>
      )}
    </Pressable>
  );
}

// ── Main tab bar ───────────────────────────────────────────────────────────
export default function CustomBottomTab({ state, descriptors, navigation }: TabBarProps) {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [collapsed, setCollapsed] = useState(getTabBarCollapsed());
  const [tabSize, setTabSize]     = useState({ w: 0, h: 0 });

  // Aura position — starts off-screen, snaps on first layout
  const auraX         = useSharedValue(-200);
  const isFirstLayout = useRef(true);

  const onTabLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    setTabSize(s => (s.w === width && s.h === height ? s : { w: width, h: height }));
  }, []);

  const focusedRoute   = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute?.key]?.options || {};
  const hideBar        = focusedOptions?.tabBarStyle?.display === 'none';
  const collapseEnabled    = focusedRoute?.name === 'index';
  const effectiveCollapsed = collapseEnabled && collapsed;
  const isScanFocused      = focusedRoute?.name === 'Kamera';

  const visibleRoutes = state.routes.filter((route: any) => {
    const options = descriptors[route.key]?.options || {};
    return !isHiddenRoute(options);
  });

  // Compute aura centre whenever focused tab or bar size changes
  useEffect(() => {
    if (tabSize.w <= 0 || isScanFocused) return;

    const focusedIdx = visibleRoutes.findIndex(
      (r: any) => r.key === state.routes[state.index]?.key,
    );
    if (focusedIdx < 0) return;

    const rowW  = tabSize.w - PADDING_H * 2;
    const tabW  = rowW / visibleRoutes.length;
    const centreX = PADDING_H + focusedIdx * tabW + tabW / 2;

    if (isFirstLayout.current) {
      auraX.value = centreX;           // instant snap on first measure
      isFirstLayout.current = false;
    } else {
      auraX.value = withSpring(centreX, { damping: 18, stiffness: 200, mass: 0.8 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, tabSize.w, isScanFocused]);

  useEffect(() => {
    const sub = subscribeTabBarCollapsed(setCollapsed);
    return () => { sub(); };
  }, []);

  if (hideBar) return null;

  return (
    <View pointerEvents="box-none" style={st.portal}>
      <View
        onLayout={onTabLayout}
        style={[
          st.container,
          {
            left:          16,
            right:         16,
            bottom:        effectiveCollapsed ? -22 : 16,
            paddingBottom: Math.max(insets.bottom, 10),
            borderColor:   Platform.OS === 'ios'
              ? 'rgba(255,255,255,0.35)'
              : 'rgba(255,255,255,0.65)',
            shadowColor:   '#0F1020',
            shadowOffset:  { width: 0, height: -4 },
            shadowOpacity: effectiveCollapsed ? 0.03 : 0.10,
            shadowRadius:  effectiveCollapsed ? 12 : 26,
            elevation:     effectiveCollapsed ? 4  : 14,
            opacity:       effectiveCollapsed ? 0.92 : 1,
            transform:     [{ scale: effectiveCollapsed ? 0.97 : 1 }],
          },
        ]}
      >
        {/* ── Glass (clipped to border-radius) ── */}
        <GlassLayer colors={Colors} tabSize={tabSize} />

        {/* ── Sliding aura (between glass and icons) ── */}
        {!isScanFocused && (
          <AuraGlow x={auraX} primaryColor={Colors.primary} />
        )}

        {/* ── Tab items — scan icon overflows via container overflow:visible ── */}
        <View style={st.row}>
          {visibleRoutes.map((route: any) => {
            const { options } = descriptors[route.key] || { options: {} };
            const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);
            const isScan    = route.name === 'Kamera';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress', target: route.key, canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                Haptics.impactAsync(
                  isScan
                    ? Haptics.ImpactFeedbackStyle.Medium
                    : Haptics.ImpactFeedbackStyle.Light,
                );
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () =>
              navigation.emit({ type: 'tabLongPress', target: route.key });

            return (
              <TabItem
                key={route.key}
                route={route}
                isFocused={isFocused}
                isScan={isScan}
                options={options}
                effectiveCollapsed={effectiveCollapsed}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  portal: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0, top: 0,
    justifyContent: 'flex-end',
  },
  container: {
    position:          'absolute',
    borderWidth:       1,
    borderRadius:      28,
    overflow:          'visible',   // ← scan button can float above the bar
    paddingTop:        6,
    paddingHorizontal: PADDING_H,
    backgroundColor:   'transparent',
  },
  glassClip: {
    borderRadius: 28,
    overflow:     'hidden',          // ← clips blur/gradient to rounded shape
  },
  topEdge: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: 12,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
  },
  topGlow: {
    position: 'absolute',
    left: 18, right: 18, top: 0,
    height: 1,
    borderRadius: 999,
  },
  // ── Aura ──
  auraHalo: {
    position:     'absolute',
    top:          4,
    width:        AURA_W,
    height:       AURA_W,
    borderRadius: AURA_W / 2,
  },
  auraCore: {
    position:      'absolute',
    top:           14,
    width:         AURA_CORE,
    height:        AURA_CORE,
    borderRadius:  AURA_CORE / 2,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius:  12,
  },
  // ── Tabs ──
  row: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'space-between',
    minHeight:      68,
  },
  item: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'flex-end',
    minHeight:      56,
    paddingBottom:  2,
  },
  scanItem: { justifyContent: 'flex-start' },
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  scanWrap: {
    marginTop:    -28,
    marginBottom: -4,
    zIndex:       10, // renders above glass layer
  },
  label: {
    marginTop:     3,
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: -0.1,
  },
  scanLabel: {
    marginTop:     1,
    fontSize:      9,
    fontWeight:    '700',
    letterSpacing: -0.1,
  },
  activePill: {
    width:        14,
    height:       3,
    borderRadius: 999,
    marginTop:    4,
  },
});
