import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import Icon from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/ThemeContext';
import type { Dokument } from '@/store';
import { getTageVerbleibend, formatFrist } from '@/utils/formatters';

/** Frist in der Zukunft, noch nicht im Kalender; bei Überfälligkeit kein Kalender-Hinweis. */
export function shouldShowDetailDeadlineBanner(dok: Dokument): boolean {
  if (!dok?.frist || dok.erledigt || dok.fristImKalender) return false;
  const tage = getTageVerbleibend(dok.frist);
  if (tage === null) return false;
  return tage >= 0;
}

type Props = {
  dok: Dokument;
  onCalendarPress: () => void;
};

export default function DetailDeadlineBanner({ dok, onCalendarPress }: Props) {
  const { Colors: C, S, R } = useTheme();
  const insets = useSafeAreaInsets();

  if (!shouldShowDetailDeadlineBanner(dok) || !dok.frist) return null;

  const fristStr = formatFrist(dok.frist);

  return (
    <View
      style={{
        position: 'absolute',
        left: S.md,
        right: S.md,
        bottom: Math.max(insets.bottom, 10) + 4,
        zIndex: 95,
      }}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        onPress={onCalendarPress}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel="Frist ins Kalender übernehmen"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: R.lg,
          backgroundColor: C.primary,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Icon name="calendar-blank" size={18} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Frist ins Kalender</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.88)', marginTop: 2 }} numberOfLines={2}>
            {fristStr} — Tippen zum Eintragen und lokale Erinnerungen aktivieren
          </Text>
        </View>
        <Icon name="caret-right" size={18} color="rgba(255,255,255,0.9)" />
      </TouchableOpacity>
    </View>
  );
}
