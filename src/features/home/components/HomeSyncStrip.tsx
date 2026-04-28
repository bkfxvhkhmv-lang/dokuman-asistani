import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import Icon from '../../../components/Icon';
import { Shadow } from '../../../theme';
import type { ThemeColors } from '../../../ThemeContext';

interface HomeSyncStripProps {
  colors: ThemeColors;
  syncStatus: string;
  letzterSync?: string | null;
  onPress: () => void;
}

export default function HomeSyncStrip({ colors, syncStatus, letzterSync, onPress }: HomeSyncStripProps) {
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

  if (syncStatus === 'idle') return null;

  const isError  = syncStatus === 'error';
  const isOk     = syncStatus === 'ok';
  const isSyncing = syncStatus === 'syncing';

  const accent = isError ? colors.danger : isOk ? colors.success : colors.primary;
  const bg     = isError ? colors.dangerLight : isOk ? colors.successLight : colors.primaryLight;
  const border = isError ? colors.dangerBorder : isOk ? `${colors.success}44` : `${colors.primary}33`;
  const textColor = isError ? colors.danger : isOk ? colors.successText || colors.success : colors.primaryDark;

  const iconName = isSyncing ? 'sync-outline' : isOk ? 'checkmark' : 'warning-outline';
  const label = isSyncing
    ? 'Synchronisierung läuft…'
    : isOk
    ? `Synchronisiert${letzterSync ? '  ·  ' + letzterSync : ''}`
    : 'Synchronisierung fehlgeschlagen — tippen zum Wiederholen';

  const strip = (
    <View style={[st.pill, { backgroundColor: bg, borderColor: border }]}>
      <Animated.View style={[st.dot, { backgroundColor: accent, opacity: isSyncing ? pulse : 1 }]} />
      <Icon name={iconName} size={11} color={textColor} />
      <Text style={[st.label, { color: textColor }]} numberOfLines={1}>{label}</Text>
    </View>
  );

  if (isError) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[st.errorStrip, { backgroundColor: bg, borderColor: border }]}
        accessibilityRole="button"
        accessibilityLabel="Synchronisierung fehlgeschlagen. Tippen zum Wiederholen."
      >
        {strip}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={isSyncing ? undefined : onPress}
      activeOpacity={isSyncing ? 1 : 0.75}
      style={st.wrap}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: isSyncing }}
    >
      {strip}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  wrap:       { marginHorizontal: 16, marginTop: 6, marginBottom: 2 },
  pill:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  label:      { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
  errorStrip: { marginHorizontal: 16, marginTop: 6, marginBottom: 2, borderRadius: 14, borderWidth: 1, ...Shadow.md },
});
