import { useEffect } from 'react';
import { StatusBar, View, StyleSheet, Platform } from 'react-native';
import { initNativeScannerBridge } from '../src/modules/scanner/engine/NativeScannerBridge';
import HeroTransitionOverlay from '../src/navigation/HeroTransitionOverlay';
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
import { useSpeechStopOnBackground } from '../src/hooks/useSpeechStopOnBackground';
import BackendHealthBootstrap from '../src/providers/BackendHealthBootstrap';
import { LanguageProvider } from '@/providers/LanguageProvider';
import { OfflineBannerProvider } from '@/contexts/OfflineBannerContext';

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
      <Stack.Screen name="onboarding" />
      <Stack.Screen
        name="first-value"
        options={{
          headerShown: false,
          animation: 'slide_from_bottom',
          gestureEnabled: false,
          contentStyle: { backgroundColor: Colors.bg },
        }}
      />
      <Stack.Screen name="index" />
      <Stack.Screen name="login"   options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)"  options={{ headerShown: false }} />
      <Stack.Screen
        name="detail"
        options={{
          headerShown: false,
          animation: Platform.OS === 'ios' ? 'ios_from_right' : 'fade_from_bottom',
          animationDuration: 320,
          contentStyle: { backgroundColor: Colors.bg },
        }}
      />
      <Stack.Screen
        name="einstellungen"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: Colors.bg },
        }}
      />
      <Stack.Screen
        name="profil"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: Colors.bg },
        }}
      />
      <Stack.Screen
        name="nebenkosten"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: Colors.bg },
        }}
      />
      <Stack.Screen
        name="nebenkosten/assistant"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: Colors.bg },
        }}
      />
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

function SpeechKillOnBackground() {
  useSpeechStopOnBackground();
  return null;
}

function ThemedRootSurface({ children }: { children: React.ReactNode }) {
  const { Colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: Colors.bg }}>{children}</View>;
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
    initNativeScannerBridge();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
          <ThemeProvider>
            <ThemedStatusBar />
            <AuthProvider>
              <StoreProvider>
                <SmartNotificationsProvider />
                <ShareExtensionProvider />
                <WidgetSyncProvider />
                <SpeechKillOnBackground />
                <BackendHealthBootstrap />
                {/* Keep root surface aligned with active theme */}
                <ThemedRootSurface>
                  <OfflineBannerProvider>
                    <ThemedNavigator />

                    {/* Floating hero expansion overlay — above all screens */}
                    <HeroTransitionOverlay />

                    {/* #101/#102 — privacy overlay + biometric gate */}
                    <PrivacyGateProvider />
                  </OfflineBannerProvider>
                </ThemedRootSurface>
              </StoreProvider>
            </AuthProvider>
          </ThemeProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
