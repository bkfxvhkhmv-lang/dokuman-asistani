import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import AiSparkle from '@/components/AiSparkle';
import Icon from '@/components/Icon';

export function FieldRow({ icon, label, value, isLast = false, aiSparkle = false }: {
  icon: string;
  label: string;
  value: string;
  isLast?: boolean;
  aiSparkle?: boolean;
}) {
  const { Colors: C } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
      borderBottomWidth: isLast ? 0 : 0.5, borderBottomColor: C.border }}>
      <View style={{ width: 26, alignItems: 'center' }}>
        <Icon name={icon} size={20} color={C.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: C.textTertiary, fontWeight: '600' }}>{label.toUpperCase()}</Text>
          {aiSparkle && <AiSparkle size={8} />}
        </View>
        <Text style={{ fontSize: 13, color: C.text, fontWeight: '600', marginTop: 2 }}>{value}</Text>
      </View>
    </View>
  );
}
