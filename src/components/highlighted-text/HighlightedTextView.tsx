import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { HIGHLIGHT_RULES } from './rules';
import { parseSegments } from './parseSegments';
import { ScanOverlay } from './ScanOverlay';
import { NeonGlowLayer } from './NeonGlowLayer';
import { EntityChip } from './EntityChip';
import { highlightedTextStyles as st } from './styles';
import type { HighlightedTextViewProps } from './types';

export default function HighlightedTextView({
  text,
  maxLength = 1400,
}: HighlightedTextViewProps) {
  const { Colors: C } = useTheme();
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const display = text
    ? text.length > maxLength ? `${text.slice(0, maxLength)}\n…` : text
    : '';

  const segments = useMemo(() => parseSegments(display), [display]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of segments)
      if (!s.plain && s.rule) c[s.rule.key] = (c[s.rule.key] || 0) + 1;
    return c;
  }, [segments]);

  const legendRules = HIGHLIGHT_RULES.filter(r => counts[r.key]);
  const neonColors = legendRules.map(r => r.neon);

  if (!text) return null;

  return (
    <View>
      {legendRules.length > 0 && (
        <View style={st.legend}>
          {legendRules.map((r, i) => (
            <EntityChip key={r.key} rule={r} count={counts[r.key]} index={i} />
          ))}
        </View>
      )}

      <View
        style={{ position: 'relative' }}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          setContainerSize({ w: width, h: height });
        }}
      >
        <Text
          style={{ fontSize: 11.5, color: C.textSecondary, lineHeight: 19 }}
          selectable
        >
          {segments.map((seg, i) =>
            seg.plain ? (
              <Text key={i}>{seg.text}</Text>
            ) : (
              <Text
                key={i}
                style={{
                  color: seg.rule?.color,
                  backgroundColor: seg.rule?.bg,
                  fontWeight: '700',
                  borderRadius: 3,
                }}
              >
                {seg.text}
              </Text>
            )
          )}
        </Text>

        <ScanOverlay
          containerW={containerSize.w}
          containerH={containerSize.h}
          scanColor={legendRules[0]?.neon ?? C.primary}
        />

        <NeonGlowLayer
          containerW={containerSize.w}
          containerH={containerSize.h}
          neonColors={neonColors}
        />
      </View>
    </View>
  );
}
