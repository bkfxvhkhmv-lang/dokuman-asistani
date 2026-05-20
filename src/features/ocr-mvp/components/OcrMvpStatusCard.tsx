import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { OcrMvpStatus } from '@/hooks/useOcrMvpJob';

const STATUS_LABEL: Record<OcrMvpStatus, string> = {
  idle:       '',
  uploading:  'Belge yükleniyor…',
  processing: 'Analiz ediliyor…',
  done:       'Tamamlandı',
  error:      'Hata oluştu',
  timeout:    'Zaman aşımı',
};

interface Props {
  status: OcrMvpStatus;
  jobId: string | null;
}

export default function OcrMvpStatusCard({ status, jobId }: Props) {
  const { Colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (status !== 'uploading' && status !== 'processing') {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [status, pulse]);

  const st = styles(Colors);

  return (
    <View style={st.container}>
      <Animated.View style={[st.dot, { opacity: pulse }]} />
      <Text style={st.label}>{STATUS_LABEL[status]}</Text>
      {jobId && (
        <Text style={st.jobId} numberOfLines={1}>Job: {jobId.slice(0, 8)}…</Text>
      )}
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container: { alignItems: 'center', padding: 40, gap: 16 },
  dot:       { width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary },
  label:     { color: C.text, fontSize: 16, fontWeight: '600' },
  jobId:     { color: C.textSecondary, fontSize: 11 },
});
