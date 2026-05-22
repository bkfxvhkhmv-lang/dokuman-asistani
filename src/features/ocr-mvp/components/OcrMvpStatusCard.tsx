import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { OcrMvpStatus } from '@/hooks/useOcrMvpJob';

type StepState = 'done' | 'active' | 'pending';

const STEPS = [
  { key: 'upload',  label: 'Belge gönderiliyor...',  doneLabel: 'Belge gönderildi'  },
  { key: 'process', label: 'OCR işleniyor...',        doneLabel: 'OCR tamamlandı'    },
  { key: 'finish',  label: 'Sonuç hazırlanıyor...',   doneLabel: 'Sonuç hazır'       },
];

function getStepState(key: string, status: OcrMvpStatus): StepState {
  if (key === 'upload')  return status === 'uploading'  ? 'active' : status === 'processing' ? 'done' : 'pending';
  if (key === 'process') return status === 'processing' ? 'active' : status === 'done'       ? 'done' : 'pending';
  return 'pending';
}

const SUB_LABEL: Partial<Record<OcrMvpStatus, string>> = {
  uploading:  'Dosya sunucuya aktarılıyor',
  processing: '10–30 saniye sürebilir',
};

interface Props {
  status: OcrMvpStatus;
}

export default function OcrMvpStatusCard({ status }: Props) {
  const { Colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;
  const st = styles(Colors);

  useEffect(() => {
    if (status !== 'uploading' && status !== 'processing') { pulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [status, pulse]);

  return (
    <View style={st.container}>
      {STEPS.map(step => {
        const state = getStepState(step.key, status);
        return (
          <View key={step.key} style={st.step}>
            <View style={st.indicator}>
              {state === 'done' && (
                <Icon name="checkmark-circle" size={22} color="#22C55E" />
              )}
              {state === 'active' && (
                <Animated.View style={[st.dot, { opacity: pulse, backgroundColor: Colors.primary }]} />
              )}
              {state === 'pending' && (
                <View style={[st.dot, { backgroundColor: Colors.border }]} />
              )}
            </View>
            <View style={st.stepText}>
              <Text style={[
                st.stepLabel,
                { color: state === 'active' ? Colors.text : state === 'done' ? '#22C55E' : Colors.textTertiary },
              ]}>
                {state === 'done' ? step.doneLabel : step.label}
              </Text>
            </View>
          </View>
        );
      })}
      {SUB_LABEL[status] && (
        <Text style={[st.subLabel, { color: Colors.textSecondary }]}>{SUB_LABEL[status]}</Text>
      )}
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container: { margin: 24, padding: 24, gap: 18, backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  step:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  indicator: { width: 22, alignItems: 'center' },
  dot:       { width: 12, height: 12, borderRadius: 6 },
  stepText:  { flex: 1 },
  stepLabel: { fontSize: 14, fontWeight: '600' },
  subLabel:  { fontSize: 12, marginTop: 4, paddingLeft: 36 },
});
