import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, runOnJS, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../ThemeContext';

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
  const [mounted, setMounted] = useState(false);

  const translateY    = useSharedValue(SCREEN_H);
  const backdropAlpha = useSharedValue(0);

  // Step 1 — mount the Modal when becoming visible
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  // Step 2 — animate in/out whenever visible or mount state changes
  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      translateY.value    = SCREEN_H;
      translateY.value    = withSpring(0, SPRING);
      backdropAlpha.value = withTiming(1, { duration: 240 });
    } else {
      translateY.value    = withTiming(SCREEN_H, { duration: 260 }, () => runOnJS(setMounted)(false));
      backdropAlpha.value = withTiming(0, { duration: 220 });
    }
  }, [visible, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, st.backdrop, bgStyle]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[st.sheet, { backgroundColor: Colors.bgCard, borderTopColor: Colors.border }, sheetStyle]}
        >
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
              style={[st.closeButton, { backgroundColor: Colors.bg, borderColor: Colors.border }]}
            >
              <Text style={[st.closeLabel, { color: Colors.textSecondary }]}>Schließen</Text>
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
    borderTopWidth:       1,
    paddingHorizontal:    20,
    paddingBottom:        34,
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
  closeButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  closeLabel:  { fontSize: 12, fontWeight: '700' },
  body:        {},
  footer:      { marginTop: 12 },
});
