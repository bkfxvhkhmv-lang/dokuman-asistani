import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';

export type PipelineStepState = 'done' | 'active' | 'pending';

export type PipelineStep = { label: string; state: PipelineStepState };

type Props = { steps: PipelineStep[] };

function glyph(state: PipelineStepState) {
  if (state === 'done') return '✓';
  if (state === 'active') return '◉';
  return '○';
}

export default function PipelineStatus({ steps }: Props) {
  const { Colors: C } = useTheme();

  return (
    <View style={{ alignSelf: 'stretch', paddingHorizontal: 36, gap: 10 }}>
      {steps.map(s => (
        <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '800',
              color: s.state === 'done' ? C.success ?? '#2E7D32' : s.state === 'active' ? C.primary : C.textTertiary,
              minWidth: 22,
            }}
          >
            {glyph(s.state)}
          </Text>
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: '600',
              color: s.state === 'pending' ? C.textTertiary : s.state === 'active' ? C.text : C.textSecondary,
              letterSpacing: 0.1,
            }}
          >
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
