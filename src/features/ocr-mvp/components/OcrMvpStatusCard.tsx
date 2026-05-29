import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { OcrMvpStatus } from '@/hooks/useOcrMvpJob';

const THUMB_W = 88;
const THUMB_H = 108;

interface Props {
  status: OcrMvpStatus;
  previewUri?: string;
}

export default function OcrMvpStatusCard({ status, previewUri }: Props) {
  const { Colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const st = styles(Colors);

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

  const isUploading = status === 'uploading';

  return (
    <View style={st.container}>
      {/* Belge thumbnail */}
      <View style={st.thumbWrap}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={st.thumbImage} resizeMode="cover" />
        ) : (
          <View style={st.thumbFallback}>
            <Icon name="document-text-outline" size={32} color={Colors.textTertiary} />
          </View>
        )}
        {status === 'processing' && (
          <Animated.View style={[st.scanLine, { transform: [{ translateY: scanY }] }]} />
        )}
      </View>

      {/* Status */}
      <View style={st.textBlock}>
        <Animated.Text style={[st.title, { opacity: pulse, color: Colors.text }]}>
          {isUploading ? 'Dokument wird gesendet' : 'Dokument wird analysiert'}
        </Animated.Text>
        {!isUploading && (
          <Text style={[st.sub, { color: Colors.textSecondary }]}>
            Text, Beträge und Fristen werden erkannt.
          </Text>
        )}
        <Text style={[st.note, { color: Colors.textTertiary }]}>
          Das kann einen Moment dauern.
        </Text>
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
  textBlock: { alignItems: 'center', gap: 8 },
  title:  { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  sub:    { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  note:   { fontSize: 12, textAlign: 'center', marginTop: 4 },
});
