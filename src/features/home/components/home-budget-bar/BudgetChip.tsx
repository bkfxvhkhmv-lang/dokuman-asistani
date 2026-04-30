import { View, Text } from 'react-native';
import { homeBudgetStyles as st } from '@/features/home/components/home-budget-bar/styles';

export function BudgetChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[st.chip, { backgroundColor: `${color}18` }]}>
      <Text style={[st.chipText, { color }]}>{label}</Text>
    </View>
  );
}
