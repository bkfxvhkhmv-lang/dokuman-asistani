import { useEffect } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import HeroTransitionOverlay from '../src/navigation/HeroTransitionOverlay';
import OfflineBanner from '../src/components/OfflineBanner';
import SperrBildschirm from '../src/components/SperrBildschirm';
import { usePrivacyGate } from '../src/hooks/usePrivacyGate';
import { Stack, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../src/ThemeContext';
import { AuthProvider } from '../src/providers/AuthContext';
import { StoreProvider } from '../src/store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { useSmartNotifications } from '../src/hooks/useSmartNotifications';
import { useShareHandler } from '../src/hooks/useShareHandler';
import { useWidgetSync } from '../src/hooks/useWidgetSync';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            5 * 60 * 1000,  // serve cached data for 5 min before background refetch
      gcTime:               15 * 60 * 1000, // keep unused cache 15 min
      retry:                1,
      refetchOnWindowFocus: false,           // mobile: no "window focus" concept
      refetchOnReconnect:   true,            // always refetch when connection restored
    },
  },
});

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent
    />
  );
}

// Renders inside ThemeProvider so it can read Colors — prevents white flash between screens.
function ThemedNavigator() {
  const { Colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login"   options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"  options={{ headerShown: false }} />
      <Stack.Screen name="detail"  options={{ headerShown: false, animation: 'none' }} />
    </Stack>
  );
}


function SmartNotificationsProvider() {
  useSmartNotifications();
  return null;
}

function ShareExtensionProvider() {
  useShareHandler();
  return null;
}

function WidgetSyncProvider() {
  useWidgetSync();
  return null;
}

function PrivacyGateProvider() {
  const { overlayVisible, lockVisible, onUnlocked } = usePrivacyGate();
  if (!overlayVisible && !lockVisible) return null;
  return (
    <>
      {/* #102 — opaque privacy cover shown IMMEDIATELY on background */}
      {overlayVisible && (
        <View style={priv.overlay} />
      )}
      {/* #101 — biometric gate on foreground return */}
      <SperrBildschirm visible={lockVisible} onEntsperrt={onUnlocked} />
    </>
  );
}

const priv = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F0F1A',
    zIndex: 99999,
  },
});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ThemedStatusBar />
            <AuthProvider>
              <StoreProvider>
                <SmartNotificationsProvider />
                <ShareExtensionProvider />
                <WidgetSyncProvider />
                <View style={{ flex: 1 }}>
                  <ThemedNavigator />

                  {/* Floating hero expansion overlay — above all screens */}
                  <HeroTransitionOverlay />

                  {/* Offline banner — slides down from top when server unreachable */}
                  <OfflineBanner />

                  {/* #101/#102 — privacy overlay + biometric gate */}
                  <PrivacyGateProvider />
                </View>
              </StoreProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
