import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { Shadow } from '@/theme';
import { useT } from '@/hooks/useT';

interface Props {
  compact?: boolean;
}

export default function BrandHeader({ compact = false }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  return (
    <View style={[st.wrap, compact && st.wrapCompact]}>
      <Image
        source={require('../../../assets/brand/briefpilot-icon-512.png')}
        style={st.badge}
        resizeMode="contain"
      />
      <Text style={[st.title, { color: C.text }]}>BriefPilot</Text>
      {!compact && (
        <Text style={[st.subtitle, { color: C.textSecondary }]}>
          {T('brand.tagline')}
        </Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap:       { alignItems: 'center', marginBottom: 32 },
  wrapCompact:{ marginBottom: 20 },

  badge: {
    width: 72, height: 72, borderRadius: 22,
    ...Shadow.lg,
  },

  title:    { fontSize: 26, fontWeight: '800', marginTop: 14, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#888', marginTop: 5, textAlign: 'center' },
});
