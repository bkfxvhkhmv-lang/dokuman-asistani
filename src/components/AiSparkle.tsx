import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/ThemeContext';

interface Props {
  size?: number;
}

export default function AiSparkle({ size = 9 }: Props) {
  const { Colors: C } = useTheme();
  return (
    <Text style={{ fontSize: size, color: C.primary, fontWeight: '700', lineHeight: size + 2 }}>
      {' ✦'}
    </Text>
  );
}
