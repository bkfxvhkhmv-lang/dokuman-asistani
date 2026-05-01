/**
 * PremiumModal — replaces React Native's plain Modal.
 * - Backdrop: blur on iOS, dark overlay on Android
 * - Content: scale 0.94→1 + fade-in (spring, 280ms)
 * - Tap backdrop to close
 */
import React, { useEffect } from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/ThemeContext';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Pass false for full-screen / sheet-style modals */
  centered?: boolean;
  contentStyle?: ViewStyle;
}

const SPRING = { damping: 20, stiffness: 260, mass: 0.5 };

export default function PremiumModal({
  visible, onClose, children, centered = true, contentStyle,
}: PremiumModalProps) {
  const { Colors } = useTheme();
  const scale   = useSharedValue(0.94);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220 });
      scale.value   = withSpring(1, SPRING);
    } else {
      opacity.value = withTiming(0, { duration: 160 });
      scale.value   = withTiming(0.96, { duration: 160 });
    }
  }, [visible]);

  const contentAnim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const backdropAnim = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={[st.root, centered && st.centered]}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropAnim]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, st.androidBackdrop]} />
          )}
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        {/* Content */}
        <Animated.View style={[contentAnim, contentStyle]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root:            { flex: 1 },
  centered:        { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  androidBackdrop: { backgroundColor: 'rgba(0,0,0,0.55)' },
});
