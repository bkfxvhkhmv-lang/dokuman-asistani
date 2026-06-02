import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { OcrMvpStatus } from '@/hooks/useOcrMvpJob';
import { useT } from '@/hooks/useT';

const THUMB_W = 172;
const THUMB_H = 216;

interface Props {
  status: OcrMvpStatus;
  previewUri?: string;
}

type StepState = 'done' | 'active' | 'upcoming';

interface StepDescriptor {
  key: string;
  label: string;
  state: StepState;
}

function getElapsedStageIndex(elapsed: number): number {
  if (elapsed >= 8) return 3;
  if (elapsed >= 5) return 2;
  if (elapsed >= 2) return 1;
  return 0;
}

function buildStepLabels(T: (key: string, vars?: Record<string, string | number>) => string, elapsed: number): string[] {
  return [
    T('ocr.status.step.prepared'),
    T('ocr.status.step.text'),
    T('ocr.status.step.details'),
    elapsed >= 8 ? T('ocr.status.step.almost_done') : T('ocr.status.step.saving'),
  ];
}

function buildStepsWithLabels(labels: string[], activeIndex: number): StepDescriptor[] {
  return labels.map((label, index) => ({
    key: `${index}-${label}`,
    label,
    state: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming',
  }));
}

export default function OcrMvpStatusCard({ status, previewUri }: Props) {
  const { Colors } = useTheme();
  const { t: T } = useT();
  const pulse = useRef(new Animated.Value(0.55)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const activeScale = useRef(new Animated.Value(1)).current;
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const st = styles(Colors);

  const activeIndex = status === 'uploading' ? 0 : getElapsedStageIndex(elapsed);
  const stepLabels = useMemo(() => buildStepLabels(T, elapsed), [T, elapsed]);

  useEffect(() => {
    if (status !== 'uploading' && status !== 'processing') {
      startedAtRef.current = null;
      setElapsed(0);
      return;
    }
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current!) / 1000));
    }, 400);
    return () => clearInterval(iv);
  }, [status]);

  useEffect(() => {
    if (status !== 'uploading' && status !== 'processing') {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [status, pulse]);

  useEffect(() => {
    if (status !== 'processing') {
      scanY.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: THUMB_H - 4, duration: 1900, useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [status, scanY]);

  useEffect(() => {
    if (status !== 'uploading' && status !== 'processing') {
      activeScale.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(activeScale, { toValue: 1.16, duration: 750, useNativeDriver: true }),
        Animated.timing(activeScale, { toValue: 1, duration: 750, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [status, activeScale]);

  const steps = useMemo(() => buildStepsWithLabels(stepLabels, activeIndex), [activeIndex, stepLabels]);

  return (
    <View style={st.shell}>
      <View style={st.card}>
        <View style={st.previewSection}>
          <View style={st.thumbShadow}>
            <View style={st.thumbWrap}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={st.thumbImage} resizeMode="cover" />
              ) : (
                <View style={st.thumbFallback}>
                  <Icon name="document-text-outline" size={54} color={Colors.textTertiary} />
                </View>
              )}
              {status === 'processing' && (
                <Animated.View style={[st.scanLine, { transform: [{ translateY: scanY }] }]} />
              )}
            </View>
          </View>

          <View style={st.copyBlock}>
            <Text style={st.cardTitle}>{T('ocr.status.title')}</Text>
            <Text style={st.cardSubtitle}>{T('ocr.status.subtitle')}</Text>
            <Text style={st.cardHint}>{T('ocr.status.hint')}</Text>
          </View>
        </View>

        <View style={st.progressCard}>
          {steps.map((step) => {
            const isActive = step.state === 'active';
            const isDone = step.state === 'done';
            return (
              <View key={step.key} style={st.progressRow}>
                <View style={st.iconWrap}>
                  {isDone ? (
                    <View style={st.doneCircle}>
                      <Icon name="checkmark-circle" size={18} color="#fff" />
                    </View>
                  ) : isActive ? (
                    <Animated.View style={[st.activeCircle, { transform: [{ scale: activeScale }], opacity: pulse }]}>
                      <View style={st.activeDot} />
                    </Animated.View>
                  ) : (
                    <View style={st.upcomingCircle} />
                  )}
                </View>
                <Text style={[st.progressLabel, isActive && st.progressLabelActive, isDone && st.progressLabelDone]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={st.footerNote}>
          <Icon name="check-circle" size={14} color={Colors.success} />
          <Text style={st.footerText}>{T('ocr.status.secure')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  shell: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 18,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: C.bgCard,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: C.borderLight,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 18,
  },
  previewSection: {
    gap: 18,
    alignItems: 'center',
  },
  thumbShadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  thumbWrap: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgInput,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: '#22C55E',
    opacity: 0.82,
  },
  copyBlock: {
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: C.textSecondary,
    textAlign: 'center',
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 19,
    color: C.textTertiary,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: C.bgInput,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  progressRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 24,
    alignItems: 'center',
  },
  doneCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.success,
  },
  activeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${C.primary}22`,
    borderWidth: 1,
    borderColor: `${C.primary}66`,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  upcomingCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.border,
  },
  progressLabel: {
    flex: 1,
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '600',
  },
  progressLabelActive: {
    color: C.text,
    fontWeight: '700',
  },
  progressLabelDone: {
    color: C.text,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'center',
  },
  stageText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
  },
});
