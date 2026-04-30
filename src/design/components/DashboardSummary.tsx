/**
 * DashboardSummary — Accountable-pattern: 3 contextual action tiles.
 * Kein Statistik-Text, sondern direkte Aktionspunkte.
 */
import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { formatBetrag } from '@/utils/formatters';
import Icon from '@/components/Icon';

type Tile = {
  icon: string;
  label: string;
  sub: string;
  badge?: number;
  color?: string;
  onPress?: () => void;
};

type Props = {
  urgent: number;
  openTasks: number;
  amountOpen: number;
  nextDeadlineDays?: number | null;
  nextDeadlineTitle?: string | null;
  currency?: string;
  onPruefe?: () => void;
  onFrist?: () => void;
  onScan?: () => void;
};

export default function DashboardSummary({
  urgent,
  openTasks,
  amountOpen,
  nextDeadlineDays,
  nextDeadlineTitle,
  currency = '€',
  onPruefe,
  onFrist,
  onScan,
}: Props) {
  const { Colors: C, R } = useTheme();

  // Tile 1 — dringende Belege prüfen
  const tile1: Tile = urgent > 0
    ? {
        icon: 'warning-circle',
        label: `${urgent} prüfen`,
        sub: `Dringend${urgent === 1 ? '' : 'e'} Belege`,
        badge: urgent,
        color: C.danger,
        onPress: onPruefe,
      }
    : openTasks > 0
    ? {
        icon: 'checkmark-circle',
        label: `${openTasks} offen`,
        sub: 'Aufgaben',
        badge: openTasks,
        color: C.warning,
        onPress: onPruefe,
      }
    : {
        icon: 'checkmark-circle',
        label: 'Alles klar',
        sub: 'Keine offenen Aufgaben',
        color: C.success,
        onPress: onPruefe,
      };

  // Tile 2 — nächste Frist
  const fristText = nextDeadlineDays == null
    ? 'Keine Frist'
    : nextDeadlineDays < 0
    ? 'Überfällig!'
    : nextDeadlineDays === 0
    ? 'Heute fällig'
    : nextDeadlineDays === 1
    ? 'Morgen fällig'
    : `${nextDeadlineDays} Tage`;

  const fristColor = nextDeadlineDays != null && nextDeadlineDays <= 3 ? C.danger
    : nextDeadlineDays != null && nextDeadlineDays <= 7 ? C.warning
    : C.primary;

  const tile2: Tile = {
    icon: 'calendar',
    label: fristText,
    sub: nextDeadlineTitle ? (nextDeadlineTitle.length > 18 ? nextDeadlineTitle.slice(0, 16) + '…' : nextDeadlineTitle) : 'Nächste Frist',
    color: fristColor,
    onPress: onFrist,
  };

  // Tile 3 — Beleg scannen (immer)
  const tile3: Tile = {
    icon: 'scan',
    label: 'Scan',
    sub: 'Beleg hinzufügen',
    color: C.primary,
    onPress: onScan,
  };

  const tiles = [tile1, tile2, tile3];

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {tiles.map((tile, i) => (
          <TouchableOpacity
            key={i}
            onPress={tile.onPress}
            activeOpacity={0.75}
            style={{
              flex: 1,
              backgroundColor: C.bgCard,
              borderRadius: R.lg,
              borderWidth: 1,
              borderColor: C.borderLight,
              padding: 14,
              alignItems: 'center',
              gap: 8,
              // subtle shadow
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
              position: 'relative',
            }}
          >
            {/* Badge */}
            {tile.badge !== undefined && tile.badge > 0 && (
              <View style={{
                position: 'absolute', top: 8, right: 8,
                backgroundColor: tile.color ?? C.primary,
                borderRadius: 999, minWidth: 18, height: 18,
                alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 5,
              }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff' }}>
                  {tile.badge > 99 ? '99+' : tile.badge}
                </Text>
              </View>
            )}

            {/* Icon */}
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: `${tile.color ?? C.primary}18`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={tile.icon} size={20} color={tile.color ?? C.primary} />
            </View>

            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{
                fontSize: 14, fontWeight: '800', color: C.text,
                textAlign: 'center',
              }} numberOfLines={1}>
                {tile.label}
              </Text>
              <Text style={{
                fontSize: 11, color: C.textSecondary,
                textAlign: 'center',
              }} numberOfLines={1}>
                {tile.sub}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
