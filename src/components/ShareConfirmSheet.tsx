import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions, Modal, TouchableOpacity, View, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';

const SCREEN_H = Dimensions.get('window').height;
const SPRING = { damping: 22, stiffness: 240, mass: 0.85 };

interface ShareConfirmSheetProps {
  visible: boolean;
  fileName: string;
  onAnalyse: () => void;
  onCancel: () => void;
  processing?: boolean;
}

export default function ShareConfirmSheet({
  visible, fileName, onAnalyse, onCancel, processing = false,
}: ShareConfirmSheetProps) {
  const { Colors } = useTheme();
  const { t: T } = useT();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(SCREEN_H);
  const backdropAlpha = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      if (fallbackRef.current) { clearTimeout(fallbackRef.current); fallbackRef.current = null; }
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      translateY.value = SCREEN_H;
      translateY.value = withSpring(0, SPRING);
      backdropAlpha.value = withTiming(1, { duration: 240 });
    } else {
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
      fallbackRef.current = setTimeout(() => {
        setMounted(false);
        fallbackRef.current = null;
      }, 650);
      translateY.value = withTiming(SCREEN_H, { duration: 260 }, () => runOnJS(setMounted)(false));
      backdropAlpha.value = withTiming(0, { duration: 220 });
    }
  }, [visible, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (fallbackRef.current) clearTimeout(fallbackRef.current); }, []);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: backdropAlpha.value }));

  const interactive = visible && mounted && !processing;

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          pointerEvents={interactive ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, st.backdrop, bgStyle]}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={onCancel} activeOpacity={1} disabled={!interactive} />
        </Animated.View>

        <Animated.View
          pointerEvents={mounted ? 'auto' : 'none'}
          style={[
            st.sheet,
            { paddingBottom: Math.max(20, insets.bottom + 16), borderTopColor: Colors.border },
            sheetStyle,
          ]}
        >
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}
          />

          <View style={st.handle}>
            <View style={[st.handleBar, { backgroundColor: Colors.border }]} />
          </View>

          <Text style={[st.title, { color: Colors.text }]}>{T('share.confirm.title')}</Text>

          <View style={[st.fileRow, { backgroundColor: Colors.bg, borderColor: Colors.border }]}>
            <Text style={[st.fileIcon, { color: Colors.textSecondary }]}>📄</Text>
            <Text style={[st.fileName, { color: Colors.text }]} numberOfLines={2} ellipsizeMode="middle">
              {fileName}
            </Text>
          </View>

          {processing ? (
            <View style={st.loadingRow}>
              <ActivityIndicator color={Colors.primary ?? Colors.text} />
              <Text style={[st.loadingLabel, { color: Colors.textSecondary }]}>{T('common.loading')}</Text>
            </View>
          ) : (
            <View style={st.actions}>
              <TouchableOpacity
                style={[st.btnPrimary, { backgroundColor: Colors.primary ?? '#6C5CE7' }]}
                onPress={onAnalyse}
                activeOpacity={0.82}
              >
                <Text style={st.btnPrimaryLabel}>{T('ocr.upload.analyze')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={st.btnCancel}
                onPress={onCancel}
                activeOpacity={0.72}
              >
                <Text style={[st.btnCancelLabel, { color: Colors.textSecondary }]}>{T('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.52)' },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0.5,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  handle: { paddingVertical: 10, alignItems: 'center' },
  handleBar: { width: 42, height: 4, borderRadius: 2 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2, marginBottom: 16 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  fileIcon: { fontSize: 20 },
  fileName: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  loadingLabel: { fontSize: 14 },
  actions: { gap: 10, paddingBottom: 4 },
  btnPrimary: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnCancel: { paddingVertical: 14, alignItems: 'center' },
  btnCancelLabel: { fontSize: 15 },
});
