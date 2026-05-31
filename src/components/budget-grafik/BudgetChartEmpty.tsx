import React from 'react';
import { View, Text } from 'react-native';

type Props = {
  seciliYil: number;
  secondaryColor: string;
  title?: string;
};

export default function BudgetChartEmpty({ seciliYil, secondaryColor, title }: Props) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
      <Text style={{ fontSize: 40 }}>📭</Text>
      <Text style={{ fontSize: 15, color: secondaryColor, marginTop: 12 }}>
        {title || `Keine Beträge für ${seciliYil}`}
      </Text>
    </View>
  );
}
