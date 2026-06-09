import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';

interface HomeHeaderClusterProps {
  colors: any;
  dringend: number;
  totalOpen: number;
  totalDocs: number;
  quickScope: 'offen' | 'alle';
  onScopeChange: (s: 'offen' | 'alle') => void;
  scrollY?: Animated.Value;
}

export default function HomeHeaderCluster({
  colors, dringend, totalOpen, totalDocs, quickScope, onScopeChange, scrollY,
}: HomeHeaderClusterProps) {
  const insets = useSafeAreaInsets();
  const { fs } = useTheme();
  const { t: T, lang } = useT();

  // Hero fades out as user scrolls (0→60px)
  const heroOpacity = scrollY
    ? scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: 'clamp' })
    : 1;

  // Hero translates up slightly on scroll (parallax)
  const heroTranslateY = scrollY
    ? scrollY.interpolate({ inputRange: [0, 80], outputRange: [0, -16], extrapolate: 'clamp' })
    : 0;

  // Compact sticky title fades in (scroll 50→100px)
  const stickyOpacity = scrollY
    ? scrollY.interpolate({ inputRange: [50, 100], outputRange: [0, 1], extrapolate: 'clamp' })
    : 0;

  return (
    <View style={[st.wrap, { paddingTop: Math.max(insets.top + 12, 24), backgroundColor: colors.bg }]}>
      {/* Top row — sticky compact title */}
      <View style={st.topRow}>
        <View style={st.titleArea}>
          <Text style={[st.greeting, { color: colors.textSecondary, fontSize: fs(13) }]}>
            {T('home.title')}
          </Text>
          {/* Sticky compact title — fades in on scroll */}
          <Animated.Text
            style={[st.stickyTitle, { color: colors.text, fontSize: fs(17), opacity: stickyOpacity }]}
            numberOfLines={1}
          >
            {T('home.title')}
          </Animated.Text>
        </View>
      </View>

      <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }}>
        <View style={st.metaRow}>
          <Text style={{ fontSize: fs(13), color: colors.textSecondary }}>
            {totalDocs} {T(totalDocs === 1 ? 'home.doc_singular' : 'home.doc_plural')} {T('home.total_suffix')}
          </Text>
          {dringend > 0 && (
            <View style={[st.urgentPill, { backgroundColor: `${colors.danger}14`, borderColor: `${colors.danger}30` }]}>
              <View style={[st.urgentDot, { backgroundColor: colors.danger }]} />
              <Text style={[st.urgentText, { color: colors.danger, fontSize: fs(12) }]}>
                {dringend} {T('home.urgent')}
              </Text>
            </View>
          )}
        </View>

        <View style={st.scopeRow}>
          {(['offen', 'alle'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[
                st.scopeChip,
                quickScope === s
                  ? { backgroundColor: colors.text }
                  : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderLight },
              ]}
              onPress={() => onScopeChange(s)}
              activeOpacity={0.7}
            >
              <Text style={[
                st.scopeLabel,
                { color: quickScope === s ? colors.bg : colors.textSecondary, fontSize: fs(13) },
              ]}>
                {s === 'offen'
                  ? `${T('home.filter.open')} ${totalOpen}`
                  : `${T('home.filter.all')} ${totalDocs}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:        { paddingHorizontal: 20, paddingBottom: 10 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  titleArea:   { flex: 1 },
  greeting:    { fontWeight: '600', letterSpacing: 0.1 },
  stickyTitle: { fontWeight: '800', letterSpacing: -0.4, marginTop: 2 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  urgentPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  urgentDot:   { width: 6, height: 6, borderRadius: 3 },
  urgentText:  { fontWeight: '700' },
  scopeRow:    { flexDirection: 'row', gap: 6 },
  scopeChip:   { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  scopeLabel:  { fontWeight: '600' },
});
