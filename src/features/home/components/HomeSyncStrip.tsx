import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { Shadow } from '@/theme';
import { useT } from '@/hooks/useT';
import type { ThemeColors } from '@/ThemeContext';

interface HomeSyncStripProps {
  colors: ThemeColors;
  syncStatus: string;
  letzterSync?: string | null;
  onPress: () => void;
}

function formatSyncTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = Math.floor((now - d.getTime()) / 60000);
    if (diff < 1)  return 'gerade eben';
    if (diff < 60) return `vor ${diff} Min.`;
    if (diff < 120) return 'vor 1 Std.';
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export default function HomeSyncStrip({ colors, syncStatus, letzterSync, onPress }: HomeSyncStripProps) {
  const { t: T } = useT();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (syncStatus === 'syncing') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse.setValue(1);
    }
  }, [syncStatus]);

  if (!syncStatus || syncStatus === 'idle' || syncStatus === 'ok' || syncStatus === 'success' || syncStatus === 'synced') return null;

  const isError   = syncStatus === 'error';
  const isSyncing = syncStatus === 'syncing';

  const accent    = isError ? colors.danger : colors.primary;
  const bg        = isError ? colors.dangerLight : colors.primaryLight;
  const border    = isError ? colors.dangerBorder : `${colors.primary}33`;
  const textColor = isError ? colors.danger : colors.primaryDark;

  const syncedAt = letzterSync ? `  ·  ${formatSyncTime(letzterSync)}` : '';
  const label    = isSyncing ? T('home.sync.running') : `${T('home.sync.error')}${syncedAt}`;

  if (isError) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[st.errorBadge, { backgroundColor: bg, borderColor: border }]}
        accessibilityRole="button"
        accessibilityLabel="Synchronisierung fehlgeschlagen. Tippen zum Wiederholen."
        activeOpacity={0.75}
      >
        <Icon name="alert-circle" size={15} color={textColor} />
        <Text style={[st.errorLabel, { color: textColor }]} numberOfLines={1}>{label}</Text>
        <Text style={[st.retryHint, { color: textColor }]}>{T('home.sync.retry')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={st.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      <View style={[st.pill, { backgroundColor: bg, borderColor: border }]}>
        <Animated.View style={[st.dot, { backgroundColor: accent, opacity: pulse }]} />
        <Icon name="sync-outline" size={12} color={textColor} />
        <Text style={[st.label, { color: textColor, fontSize: 11 }]} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:        { marginHorizontal: 16, marginTop: 6, marginBottom: 2 },
  pill:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  dot:         { width: 6, height: 6, borderRadius: 3 },
  label:       { fontWeight: '700', letterSpacing: 0.1 },
  retryHint:   { fontSize: 11, fontWeight: '600', opacity: 0.7 },
  errorBadge:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 16, marginTop: 6, marginBottom: 2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, alignSelf: 'flex-start', ...Shadow.sm },
  errorLabel:  { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
});
