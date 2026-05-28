import { View, Text } from 'react-native';
import type { FieldConfidence } from '@/services/SmartAutoFillService';

import { CONFIDENCE_COLORS, CONFIDENCE_LABEL } from './confidenceConstants';

interface ConfidencePillProps {
  confidence: FieldConfidence;
  score: number;
}

export function ConfidencePill({ confidence, score }: ConfidencePillProps) {
  const c = CONFIDENCE_COLORS[confidence];
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 1, borderColor: c.border,
    }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.dot }} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: c.text }}>
        {CONFIDENCE_LABEL[confidence]}
      </Text>
    </View>
  );
}
