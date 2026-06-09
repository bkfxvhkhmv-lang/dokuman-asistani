import { View, Text } from 'react-native';
import type { ThemeColors } from '@/ThemeContext';

interface OverallConfidenceBarProps {
  percent: number;
  C: ThemeColors;
}

export function OverallConfidenceBar({ percent, C }: OverallConfidenceBarProps) {
  return (
    <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: C.textTertiary }}>Erkennungs-Genauigkeit</Text>
        <Text style={{
          fontSize: 11, fontWeight: '700',
          color: percent >= 75 ? '#1D9E75' : percent >= 50 ? '#BA7517' : '#E24B4A',
        }}>
          {percent}%
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{
          height: 6, borderRadius: 3,
          width: `${percent}%`,
          backgroundColor: percent >= 75 ? '#1D9E75' : percent >= 50 ? '#BA7517' : '#E24B4A',
        }} />
      </View>
    </View>
  );
}
