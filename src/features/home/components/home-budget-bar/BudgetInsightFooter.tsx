import { View, Text } from 'react-native';
import type { BudgetInsight } from '@/services/BudgetEngine';
import { useTheme } from '@/ThemeContext';
import { homeBudgetStyles as st } from '@/features/home/components/home-budget-bar/styles';

interface Props {
  insight: BudgetInsight | undefined;
  hasTarget: boolean;
}

export function BudgetInsightFooter({ insight, hasTarget }: Props) {
  const { Colors } = useTheme();

  if (insight) {
    return (
      <View style={[st.insightRow, { borderTopColor: 'rgba(0,0,0,0.07)' }]}>
        <Text style={[st.insightText, {
          color: insight.severity === 'hoch' ? '#EE6055'
            : insight.severity === 'mittel' ? '#FFB703'
            : Colors.textSecondary,
        }]}>
          {insight.type === 'anomalie' ? '⚠️ ' : insight.type === 'vorhersage' ? '🔮 ' : '💡 '}
          {insight.text}
        </Text>
      </View>
    );
  }

  if (!hasTarget) {
    return (
      <View style={[st.insightRow, { borderTopColor: 'rgba(0,0,0,0.07)' }]}>
        <Text style={[st.insightText, { color: Colors.primary }]}>
          🎯 Monatsziel setzen — Tippe hier
        </Text>
      </View>
    );
  }

  return null;
}
