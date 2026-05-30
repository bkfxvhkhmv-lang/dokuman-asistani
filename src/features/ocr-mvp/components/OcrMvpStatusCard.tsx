import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { OcrMvpStatus } from '@/hooks/useOcrMvpJob';

const THUMB_W = 124;
const THUMB_H = 152;

interface Props {
  status: OcrMvpStatus;
  previewUri?: string;
}

function getStagedCopy(elapsed: number): string {
  if (elapsed >= 8) return 'Fast fertig…';
  if (elapsed >= 5) return 'Beträge und Fristen werden geprüft';
  if (elapsed >= 2) return 'Text wird erkannt';
  return 'Dokument wird vorbereitet';
}

export default function OcrMvpStatusCard({ status, previewUri }: Props) {
  const { Colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const st = styles(Colors);

  useEffect(() => {
    if (status !== 'uploading' && status !== 'processing') return;
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current!) / 1000));
    }, 500);
    return () => clearInterval(iv);
  }, [status]);

  useEffect(() => {
    if (status !== 'uploading' && status !== 'processing') { pulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [status, pulse]);

  useEffect(() => {
    if (status !== 'processing') { scanY.setValue(0); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: THUMB_H - 2, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0,           duration: 200,  useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [status, scanY]);

  return (
    <View style={st.container}>
      {/* Belge thumbnail */}
      <View style={st.thumbWrap}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={st.thumbImage} resizeMode="cover" />
        ) : (
          <View style={st.thumbFallback}>
            <Icon name="document-text-outline" size={36} color={Colors.textTertiary} />
          </View>
        )}
        {status === 'processing' && (
          <Animated.View style={[st.scanLine, { transform: [{ translateY: scanY }] }]} />
        )}
      </View>

      {/* Status */}
      <View style={st.textBlock}>
        <Animated.Text style={[st.title, { opacity: pulse, color: Colors.text }]}>
          {getStagedCopy(elapsed)}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 28,
    paddingHorizontal: 32,
  },
  thumbWrap: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgInput,
  },
  thumbImage:    { width: '100%', height: '100%' },
  thumbFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  scanLine: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: 2,
    backgroundColor: '#22C55E',
    opacity: 0.6,
  },
  textBlock: { alignItems: 'center' },
  title:  { fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
