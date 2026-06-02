import React, { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '@/components/Icon';

interface TabColors {
  bgCard: string;
  border: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  textTertiary: string;
}

interface TabIconProps {
  name: string;
  focused: boolean;
  color: string;
  colors: TabColors;
}

export interface MainTabDefinition {
  name: string;
  options: (colors: TabColors) => Record<string, unknown>;
}

function TabIcon({ name, focused, color, colors }: TabIconProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      Animated.spring(scale, {
        toValue: 1.12,
        damping: 14,
        stiffness: 260,
        useNativeDriver: true,
      }).start(() => {
        Animated.spring(scale, {
          toValue: 1,
          damping: 14,
          stiffness: 260,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [focused]);

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 36,
        borderRadius: 18,
        backgroundColor: focused ? colors.primaryLight : 'transparent',
      }}
    >
      <Icon name={name} size={focused ? 22 : 20} color={focused ? colors.primaryDark : color} />
    </Animated.View>
  );
}

function ScanTabIcon({ focused, colors }: { focused: boolean; colors: TabColors }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const scanScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (focused) {
      Animated.spring(scanScale, {
        toValue: 1.08,
        damping: 12,
        stiffness: 240,
        useNativeDriver: true,
      }).start(() => {
        Animated.spring(scanScale, {
          toValue: 1,
          damping: 12,
          stiffness: 240,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [focused]);

  const pulseScale   = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.26, 0.09, 0] });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 80, height: 80 }}>
      {/* Outer glow halo — iOS native shadow, Android larger radial gradient */}
      {Platform.OS === 'ios' ? (
        <View style={{
          position: 'absolute',
          width: 62, height: 62, borderRadius: 31,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: focused ? 0.24 : 0.10,
          shadowRadius: focused ? 10 : 6,
          backgroundColor: 'transparent',
        }} />
      ) : (
        // Android: daraltilmis radial glow — komsu tab etiketlerine tasmasin
        <LinearGradient
          colors={[
            `${colors.primary}${focused ? '30' : '18'}`,
            `${colors.primary}${focused ? '18' : '0D'}`,
            `${colors.primary}${focused ? '0A' : '05'}`,
            'transparent',
          ]}
          style={{
            position: 'absolute',
            width: 108, height: 108, borderRadius: 54,
            top: -14, left: -14,
          }}
          pointerEvents="none"
        />
      )}

      {/* Pulse ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 58, height: 58, borderRadius: 29,
          borderWidth: 1.25, borderColor: `${colors.primary}CC`,
          transform: [{ scale: pulseScale }],
          opacity: pulseOpacity,
        }}
      />

      {/* Main button */}
      <Animated.View
        style={{
          transform: [{ scale: scanScale }],
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: focused ? colors.primary : '#FFFFFF',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: focused ? 7 : 3 },
          shadowOpacity: focused ? 0.22 : 0.10,
          shadowRadius: focused ? 10 : 6,
          elevation: focused ? 10 : 5,
          borderWidth: 0.8,
          borderColor: `${colors.primary}${focused ? '70' : '28'}`,
        }}
      >
        {/* Inner shine (iOS Photos style top-gloss) */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 32,
          borderTopLeftRadius: 32, borderTopRightRadius: 32,
          backgroundColor: focused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)',
          overflow: 'hidden',
        }} pointerEvents="none" />
        <Icon name="scan" size={26} color={focused ? '#fff' : colors.primary} weight="bold" />
      </Animated.View>
    </View>
  );
}

export const MAIN_TABS: MainTabDefinition[] = [
  {
    name: 'index',
    options: (colors: TabColors) => ({
      tabBarLabel: 'Dokumente',
      tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
        <TabIcon name="files" focused={focused} color={color} colors={colors} />
      ),
    }),
  },
  {
    name: 'Suche',
    options: (colors: TabColors) => ({
      tabBarLabel: 'Suche',
      tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
        <TabIcon name="magnifying-glass" focused={focused} color={color} colors={colors} />
      ),
    }),
  },
  {
    name: 'Kamera',
    options: (colors: TabColors) => ({
      tabBarLabel: 'Scan',
      tabBarStyle: { display: 'none' },
      tabBarIcon: ({ focused }: { focused: boolean; color: string }) => (
        <ScanTabIcon focused={focused} colors={colors} />
      ),
    }),
  },
  {
    name: 'Export',
    // Hidden until export document selection is confirmed working on device.
    // Per-document export remains available in Detail → Dokument tab.
    options: () => ({ href: null }),
  },
  {
    name: 'Marktplatz',
    options: () => ({
      href: null,
    }),
  },
  {
    name: 'Profil',
    options: (colors: TabColors) => ({
      tabBarLabel: 'Einstellungen',
      tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
        <TabIcon name="gear" focused={focused} color={color} colors={colors} />
      ),
    }),
  },
];
