import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';

type Props = {
  variant?: 'inline' | 'banner';
};

export default function DemoTrustLabel({ variant = 'inline' }: Props) {
  const { Colors: C, fs } = useTheme();
  const { t: T } = useT();
  const label = T('demo.trust_label');

  if (variant === 'banner') {
    return (
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 6,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 9,
          backgroundColor: C.primaryLight,
          borderWidth: 0.5,
          borderColor: `${C.primary}33`,
        }}
      >
        <Text style={{ fontSize: 11, color: C.primaryDark, fontWeight: '500', lineHeight: 15 }}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <Text
      style={[styles.inline, { color: C.textTertiary, fontSize: fs(11), lineHeight: fs(11) * 1.45 }]}
      numberOfLines={2}
      maxFontSizeMultiplier={1.3}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  inline: { letterSpacing: -0.1 },
});
