import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { DocumentDigitalTwinModel } from '@/core/intelligence/DocumentDigitalTwin';
import { useT } from '@/hooks/useT';

const STEP_KEYS = ['received', 'reviewing', 'action_needed', 'resolved'] as const;

function stepIndex(phase: string | undefined): number {
  if (phase === 'received') return 0;
  if (phase === 'reviewing' || phase === 'waiting') return 1;
  if (phase === 'action_needed' || phase === 'overdue') return 2;
  if (phase === 'resolved') return 3;
  return 1;
}

interface DetailProcessTrackerProps {
  digitalTwin: DocumentDigitalTwinModel | null | undefined;
}

export default function DetailProcessTracker({ digitalTwin }: DetailProcessTrackerProps) {
  const { Colors: C, S, R } = useTheme();
  const { t: T } = useT();
  if (!digitalTwin) return null;

  const activeIndex = stepIndex(digitalTwin?.intelligence?.lifecycle?.phase);
  const summary = digitalTwin?.statusSummary || 'Vorgangsstatus wird geladen …';

  const stepLabel = (key: string): string => {
    if (key === 'received')      return T('detail.step.scanned');
    if (key === 'reviewing')     return T('detail.step.analysed');
    if (key === 'action_needed') return T('detail.step.action');
    if (key === 'resolved')      return T('detail.step.done');
    return key;
  };

  return (
    <View style={{ marginHorizontal: S.md, marginTop: S.sm, marginBottom: S.sm, borderRadius: R.lg,
      padding: S.md, backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>Vorgangsstatus</Text>
        <Text style={{ fontSize: 11, color: C.textSecondary }} numberOfLines={1}>{summary}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {STEP_KEYS.map((key, index) => {
          const isActive  = index <= activeIndex;
          const isCurrent = index === activeIndex;
          return (
            <React.Fragment key={key}>
              <View style={{ alignItems: 'center', width: 64 }}>
                <View style={{ width: isCurrent ? 18 : 14, height: isCurrent ? 18 : 14, borderRadius: 999,
                  backgroundColor: isActive ? C.primary : C.borderLight,
                  borderWidth: isCurrent ? 3 : 0, borderColor: isCurrent ? `${C.primary}33` : 'transparent', marginBottom: 6 }} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={{ fontSize: 10, fontWeight: isCurrent ? '700' : '500',
                    color: isActive ? C.text : C.textTertiary, textAlign: 'center', width: '100%' }}
                >{stepLabel(key)}</Text>
              </View>
              {index < STEP_KEYS.length - 1 && (
                <View style={{ flex: 1, height: 2, marginBottom: 18,
                  backgroundColor: index < activeIndex ? C.primary : C.borderLight }} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
