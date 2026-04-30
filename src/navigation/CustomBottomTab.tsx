/**
 * CustomBottomTab — Cam efektli, animasyonlu alt sekme cubugu.
 *
 * Bu dosya yalnizca state ve callback yonetimini yapar; gorsel
 * parcalari `./tab-bar/` altindaki ozel bilesenlere devreder:
 *
 *  - GlassLayer  — cam (frosted) arka plan (iOS native blur / Android Skia)
 *  - AuraGlow    — aktif sekme altinda gezinen halo + core
 *  - TabItem     — tek bir tab item'i (icon + label + animasyon)
 *
 * Eski monolithic versiyon 444 satir tek dosyaydi; modulerlestirme
 * sonrasi her bilesen ayri test edilebilir.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/ThemeContext';
import { getTabBarCollapsed, subscribeTabBarCollapsed } from '@/navigation/tabBarVisibility';

import GlassLayer from '@/navigation/tab-bar/GlassLayer';
import AuraGlow   from '@/navigation/tab-bar/AuraGlow';
import TabItem    from '@/navigation/tab-bar/TabItem';
import { isHiddenRoute } from '@/navigation/tab-bar/utils';
import { PADDING_H } from '@/navigation/tab-bar/constants';
import { tabStyles as st } from '@/navigation/tab-bar/styles';

type TabBarProps = { state: any; descriptors: any; navigation: any };

export default function CustomBottomTab({ state, descriptors, navigation }: TabBarProps) {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [collapsed, setCollapsed] = useState(getTabBarCollapsed());
  const [tabSize, setTabSize]     = useState({ w: 0, h: 0 });

  // Aura pozisyonu — ekran disinda baslar, ilk layout'ta snap eder
  const auraX         = useSharedValue(-200);
  const isFirstLayout = useRef(true);

  const onTabLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    setTabSize(s => (s.w === width && s.h === height ? s : { w: width, h: height }));
  }, []);

  const focusedRoute   = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute?.key]?.options || {};
  const hideBar        = focusedOptions?.tabBarStyle?.display === 'none';

  // Sadece ana sayfada (index) bar tam goster/gizle calisir
  const collapseEnabled    = focusedRoute?.name === 'index';
  const effectiveCollapsed = collapseEnabled && collapsed;
  const isScanFocused      = focusedRoute?.name === 'Kamera';

  const visibleRoutes = state.routes.filter((route: any) => {
    const options = descriptors[route.key]?.options || {};
    return !isHiddenRoute(options);
  });

  // Aura'yi merkez tab koordinatina kaydir
  useEffect(() => {
    if (tabSize.w <= 0 || isScanFocused) return;

    const focusedIdx = visibleRoutes.findIndex(
      (r: any) => r.key === state.routes[state.index]?.key,
    );
    if (focusedIdx < 0) return;

    const rowW    = tabSize.w - PADDING_H * 2;
    const tabW    = rowW / visibleRoutes.length;
    const centreX = PADDING_H + focusedIdx * tabW + tabW / 2;

    if (isFirstLayout.current) {
      auraX.value = centreX; // Ilk olcumde anlik snap (animasyonsuz)
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
            shadowRadius:  effectiveCollapsed ? 12   : 26,
            elevation:     effectiveCollapsed ? 4    : 14,
            opacity:       effectiveCollapsed ? 0.92 : 1,
            transform:     [{ scale: effectiveCollapsed ? 0.97 : 1 }],
          },
        ]}
      >
        {/* Glass arka plan (border-radius'a kirpilmis) */}
        <GlassLayer colors={Colors} tabSize={tabSize} />

        {/* Hareketli aura (glass ile ikonlar arasinda) */}
        {!isScanFocused && <AuraGlow x={auraX} primaryColor={Colors.primary} />}

        {/* Tab item'lar — scan butonu container'in overflow:visible'i ile tasar */}
        <View style={st.row}>
          {visibleRoutes.map((route: any) => {
            const { options } = descriptors[route.key] || { options: {} };
            const isFocused   = state.index === state.routes.findIndex((r: any) => r.key === route.key);
            const isScan      = route.name === 'Kamera';

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
