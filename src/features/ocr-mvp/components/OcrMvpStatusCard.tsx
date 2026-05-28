import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { OcrMvpStatus } from '@/hooks/useOcrMvpJob';

type StepState = 'done' | 'active' | 'pending';

const STEPS = [
  { key: 'upload',  label: 'Dokument wird gesendet ...',    doneLabel: 'Dokument gesendet'  },
  { key: 'process', label: 'Dokument wird analysiert …',    doneLabel: 'Analyse abgeschlossen' },
  { key: 'finish',  label: 'Ergebnis wird vorbereitet ...', doneLabel: 'Ergebnis bereit'    },
];

function getStepState(key: string, status: OcrMvpStatus): StepState {
  if (key === 'upload')  return status === 'uploading'  ? 'active' : status === 'processing' ? 'done' : 'pending';
  if (key === 'process') return status === 'processing' ? 'active' : status === 'done'       ? 'done' : 'pending';
  return 'pending';
}

const SUB_LABEL: Partial<Record<OcrMvpStatus, string>> = {
  uploading:  'Datei wird hochgeladen',
  processing: 'Kann 10–30 Sekunden dauern',
};

const THUMB_W = 72;
const THUMB_H = 88;

interface Props {
  status: OcrMvpStatus;
  previewUri?: string;
}

export default function OcrMvpStatusCard({ status, previewUri }: Props) {
  const { Colors } = useTheme();
  const pulse  = useRef(new Animated.Value(0.4)).current;
  const scanY  = useRef(new Animated.Value(0)).current;
  const st = styles(Colors);

  // Pulse animation for active step dot
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

  // Scan line sweeps top→bottom during OCR processing
  useEffect(() => {
    if (status !== 'processing') { scanY.setValue(0); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: THUMB_H - 2, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0,           duration: 250,  useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [status, scanY]);

  const showThumb = status === 'uploading' || status === 'processing';

  return (
    <View style={st.container}>
      {showThumb && (
        <View style={st.thumbWrap}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={st.thumbImage} resizeMode="cover" />
          ) : (
            <View style={st.thumbFallback}>
              <Icon name="document-text-outline" size={28} color={Colors.textTertiary} />
            </View>
          )}
          {status === 'processing' && (
            <Animated.View
              style={[st.scanLine, { transform: [{ translateY: scanY }] }]}
            />
          )}
        </View>
      )}

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
  container:    { margin: 24, padding: 24, gap: 18, backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  thumbWrap: {
    alignSelf: 'center',
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgInput,
  },
  thumbImage:   { width: '100%', height: '100%' },
  thumbFallback: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: 2,
    backgroundColor: '#22C55E',
    opacity: 0.55,
  },
  step:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  indicator: { width: 22, alignItems: 'center' },
  dot:       { width: 12, height: 12, borderRadius: 6 },
  stepText:  { flex: 1 },
  stepLabel: { fontSize: 14, fontWeight: '600' },
  subLabel:  { fontSize: 12, marginTop: 4, paddingLeft: 36 },
});
