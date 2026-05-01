import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/hooks/useT';
import type { ThemeColors } from '@/ThemeContext';

const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 78 : 72;

type Props = {
  count: number;
  onAbbrechen: () => void;
  onExport: () => void;
  onSteuerpaket: () => void;
  onLoeschen: () => void;
  C: ThemeColors;
  dangerColor: string;
};

/** Mehrfachauswahl: Aktionen oberhalb der Tab-Leiste */
export default function HomeSelectionBar({
  count, onAbbrechen, onExport, onSteuerpaket, onLoeschen, C, dangerColor,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t: T } = useT();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + TAB_BAR_CLEARANCE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginHorizontal: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.bgCard,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <TouchableOpacity onPress={onAbbrechen} hitSlop={8}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>{T('common.cancel')}</Text>
      </TouchableOpacity>
      <Text style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: C.text }} numberOfLines={1}>
        {T('home.selection_count', { n: count })}
      </Text>
      <TouchableOpacity onPress={onSteuerpaket} hitSlop={6}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: C.primary }}>Steuer</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onExport} hitSlop={6}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: C.primary }}>PDF</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onLoeschen} hitSlop={6}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: dangerColor }}>{T('common.delete')}</Text>
      </TouchableOpacity>
    </View>
  );
}
