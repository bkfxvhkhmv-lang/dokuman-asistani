import { View, Text } from 'react-native';
import type { TargetAnalysis } from '@/services/TargetService';
import { useTheme } from '@/ThemeContext';
import { homeBudgetStyles as st } from '@/features/home/components/home-budget-bar/styles';

interface Props {
  topTarget: TargetAnalysis;
  pctFilled: number;
  statusColor: string;
}

export function BudgetTargetProgressSection({ topTarget, pctFilled, statusColor }: Props) {
  const { Colors } = useTheme();

  return (
    <View style={st.progressSection}>
      <View style={[st.progressTrack, { backgroundColor: Colors.bgInput }]}>
        <View style={[st.progressFill, { width: `${pctFilled * 100}%`, backgroundColor: statusColor }]} />
        {topTarget.projectedPct < 1.3 && topTarget.projectedPct > pctFilled && (
          <View style={[
            st.projectedMarker,
            { left: `${Math.min(topTarget.projectedPct * 100, 97)}%`, backgroundColor: statusColor },
          ]} />
        )}
      </View>
      <View style={st.progressLabels}>
        <Text style={[st.progressLabel, { color: statusColor }]}>
          {topTarget.statusLabel} · {Math.round(topTarget.pct * 100)}%
        </Text>
        <Text style={[st.velocityText, { color: Colors.textTertiary }]}>
          {topTarget.velocityStr}
        </Text>
      </View>
    </View>
  );
}
