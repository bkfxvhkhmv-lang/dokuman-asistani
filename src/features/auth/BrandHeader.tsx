import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { Shadow } from '@/theme';
import { useT } from '@/hooks/useT';

interface Props {
  compact?: boolean;
}

function LogoMark({ color }: { color: string }) {
  return (
    <View style={[st.badge, { backgroundColor: color }]}>
      {/* Document outline */}
      <View style={st.doc}>
        {/* Corner fold */}
        <View style={[st.fold, { backgroundColor: color }]} />
        {/* Text lines */}
        <View style={[st.line, { width: 18, top: 13, opacity: 1 }]} />
        <View style={[st.line, { width: 14, top: 20, opacity: 0.65 }]} />
        <View style={[st.line, { width: 16, top: 27, opacity: 0.65 }]} />
      </View>
    </View>
  );
}

export default function BrandHeader({ compact = false }: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  return (
    <View style={[st.wrap, compact && st.wrapCompact]}>
      <LogoMark color={C.primary} />
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
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.lg,
  },

  doc: {
    width: 30, height: 38, borderRadius: 5,
    borderWidth: 2.5, borderColor: '#fff',
    position: 'relative', overflow: 'visible',
  },
  fold: {
    position: 'absolute', top: -2.5, right: -2.5,
    width: 11, height: 11,
    borderBottomLeftRadius: 4,
  },
  line: {
    position: 'absolute', left: 5, height: 2.5,
    backgroundColor: '#fff', borderRadius: 1.5,
  },

  title:    { fontSize: 26, fontWeight: '800', marginTop: 14, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#888', marginTop: 5, textAlign: 'center' },
});
