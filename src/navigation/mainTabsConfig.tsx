import React, { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import Icon from '../components/Icon';

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

  const pulseScale   = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.52] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.45, 0.15, 0] });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 72, height: 72 }}>
      {/* Pulse ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 62, height: 62, borderRadius: 31,
          borderWidth: 2, borderColor: colors.primary,
          transform: [{ scale: pulseScale }],
          opacity: pulseOpacity,
        }}
      />
      {/* Android glow halkası — colored elevation taklit */}
      {Platform.OS === 'android' && (
        <View style={{
          position: 'absolute',
          width: 68, height: 68, borderRadius: 34,
          backgroundColor: focused ? `${colors.primary}28` : `${colors.primary}14`,
          elevation: focused ? 14 : 6,
        }} />
      )}
      {/* Main button */}
      <Animated.View
        style={{
          transform: [{ scale: scanScale }],
          width: 62, height: 62, borderRadius: 31,
          backgroundColor: focused ? colors.primary : '#FFFFFF',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: focused ? 0.45 : 0.22,
          shadowRadius: focused ? 32 : 18,
          elevation: focused ? 16 : 9,
          borderWidth: Platform.OS === 'android' ? 1.5 : 0.8,
          borderColor: `${colors.primary}${focused ? '60' : '30'}`,
        }}
      >
        <Icon name="scan" size={24} color={focused ? '#fff' : colors.primary} />
      </Animated.View>
    </View>
  );
}

export const MAIN_TABS: MainTabDefinition[] = [
  {
    name: 'index',
    options: (colors: TabColors) => ({
      tabBarLabel: 'Docs',
      tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
        <TabIcon name="files" focused={focused} color={color} colors={colors} />
      ),
    }),
  },
  {
    name: 'Suche',
    options: (colors: TabColors) => ({
      tabBarLabel: 'Search',
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
    name: 'Marktplatz',
    options: () => ({
      href: null,
    }),
  },
  {
    name: 'Profil',
    options: (colors: TabColors) => ({
      tabBarLabel: 'Profile',
      tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
        <TabIcon name="user-circle" focused={focused} color={color} colors={colors} />
      ),
    }),
  },
];
