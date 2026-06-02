import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';

const SCREEN_H = Dimensions.get('window').height;
const SPRING   = { damping: 22, stiffness: 240, mass: 0.85 };

export interface AppSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AppSheet({
  visible, onClose, title, subtitle, children, footer,
}: AppSheetProps) {
  const { Colors } = useTheme();
  const { t: T } = useT();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const closeFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY    = useSharedValue(SCREEN_H);
  const backdropAlpha = useSharedValue(0);

  // Step 1 — mount the Modal when becoming visible
  useEffect(() => {
    if (visible) {
      if (closeFallbackRef.current) {
        clearTimeout(closeFallbackRef.current);
        closeFallbackRef.current = null;
      }
      setMounted(true);
    }
  }, [visible]);

  // Step 2 — animate in/out whenever visible or mount state changes
  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      translateY.value    = SCREEN_H;
      translateY.value    = withSpring(0, SPRING);
      backdropAlpha.value = withTiming(1, { duration: 240 });
    } else {
      if (closeFallbackRef.current) clearTimeout(closeFallbackRef.current);
      closeFallbackRef.current = setTimeout(() => {
        if (__DEV__) {
          console.warn('[APPSHEET_GUARD] forced unmount after close timeout');
        }
        setMounted(false);
        closeFallbackRef.current = null;
      }, 650);
      translateY.value    = withTiming(SCREEN_H, { duration: 260 }, () => runOnJS(setMounted)(false));
      backdropAlpha.value = withTiming(0, { duration: 220 });
    }
  }, [visible, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (closeFallbackRef.current) {
        clearTimeout(closeFallbackRef.current);
        closeFallbackRef.current = null;
      }
    };
  }, []);

  // Swipe-to-close gesture — attached only to the handle area
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value    = e.translationY;
        backdropAlpha.value = interpolate(
          e.translationY, [0, SCREEN_H * 0.45], [1, 0], Extrapolation.CLAMP,
        );
      }
    })
    .onEnd((e) => {
      const shouldClose = e.velocityY > 600 || e.translationY > SCREEN_H * 0.28;
      if (shouldClose) {
        translateY.value    = withTiming(SCREEN_H, { duration: 240 }, () => runOnJS(onClose)());
        backdropAlpha.value = withTiming(0, { duration: 200 });
      } else {
        translateY.value    = withSpring(0, SPRING);
        backdropAlpha.value = withTiming(1, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: backdropAlpha.value,
  }));

  const interactive = visible && mounted;

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop */}
        <Animated.View
          pointerEvents={interactive ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, st.backdrop, bgStyle]}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} disabled={!interactive} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          pointerEvents={interactive ? 'auto' : 'none'}
          style={[
            st.sheet,
            { borderTopColor: Colors.border, paddingBottom: Math.max(20, insets.bottom + 12) },
            Platform.OS === 'android' && { elevation: 8, borderTopWidth: 1 },
            sheetStyle,
          ]}
        >
          {/* Surface background — solid, no BlurView to avoid native touch interception */}
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}
          />

          {/* Handle — gesture target */}
          <GestureDetector gesture={pan}>
            <Animated.View style={st.handleArea}>
              <View style={[st.handle, { backgroundColor: Colors.border }]} />
            </Animated.View>
          </GestureDetector>

          {/* Header */}
          <View style={st.headerRow}>
            <View style={st.headerCopy}>
              {!!title    && <Text style={[st.title,    { color: Colors.text          }]}>{title}</Text>}
              {!!subtitle && <Text style={[st.subtitle, { color: Colors.textSecondary }]}>{subtitle}</Text>}
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.82}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[st.closeButton, { backgroundColor: Colors.bg, borderColor: Colors.border }]}
            >
              <Text style={[st.closeLabel, { color: Colors.textSecondary }]}>{T('common.close')}</Text>
            </TouchableOpacity>
          </View>

          {children ? <View style={st.body}>{children}</View> : null}
          {footer    ? <View style={st.footer}>{footer}</View>  : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    borderTopWidth:       0.5,
    paddingHorizontal:    20,
    overflow:             'hidden',
    maxHeight:            '88%',
  },
  handleArea: {
    paddingVertical: 10,
    alignItems:      'center',
  },
  handle: {
    width: 42, height: 4, borderRadius: 2,
  },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    gap:            12,
    marginBottom:   4,
  },
  headerCopy:  { flex: 1, paddingRight: 8 },
  title:       { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  subtitle:    { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 18 },
  closeButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  closeLabel:  { fontSize: 12, fontWeight: '700' },
  body:        {},
  footer:      { marginTop: 12 },
});
