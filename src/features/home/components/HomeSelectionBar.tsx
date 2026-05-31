import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { ThemeColors } from '@/ThemeContext';

const BOTTOM_CLEARANCE = 12; // tab bar is hidden while selection bar is visible

type Props = {
  count: number;
  onAbbrechen: () => void;
  onExport: () => void;
  onSteuerpaket: () => void;
  onLoeschen: () => void;
  C: ThemeColors;
  dangerColor: string;
};

export default function HomeSelectionBar({
  count, onAbbrechen, onExport, onSteuerpaket, onLoeschen, C, dangerColor,
}: Props) {
  const insets = useSafeAreaInsets();
  const label = count === 1 ? '1 Dokument ausgewählt' : `${count} Dokumente ausgewählt`;
  const hasSelection = count > 0;

  return (
    <View
      style={[
        st.bar,
        {
          bottom: insets.bottom + BOTTOM_CLEARANCE,
          backgroundColor: C.bgCard,
          borderColor: C.border,
        },
      ]}
    >
      {/* Count row */}
      <View style={st.countRow}>
        <TouchableOpacity
          onPress={onAbbrechen}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={st.cancelBtn}
        >
          <Text style={[st.cancelLabel, { color: C.textSecondary }]}>Abbrechen</Text>
        </TouchableOpacity>
        <Text style={[st.countLabel, { color: C.text }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={st.cancelPlaceholder} />
      </View>

      <View style={[st.divider, { backgroundColor: C.border }]} />

      {/* Actions row */}
      <View style={st.actionsRow}>
        <TouchableOpacity
          onPress={onSteuerpaket}
          style={st.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          disabled={!hasSelection}
        >
          <Icon name="folder-open" size={20} color={hasSelection ? C.primary : C.textTertiary} />
          <Text style={[st.actionLabel, { color: hasSelection ? C.primary : C.textTertiary }]}>
            Steuer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onExport}
          style={st.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          disabled={!hasSelection}
        >
          <Icon name="upload-simple" size={20} color={hasSelection ? C.primary : C.textTertiary} />
          <Text style={[st.actionLabel, { color: hasSelection ? C.primary : C.textTertiary }]}>
            Exportieren
          </Text>
        </TouchableOpacity>

        <View style={[st.verticalSep, { backgroundColor: C.border }]} />

        <TouchableOpacity
          onPress={onLoeschen}
          style={st.actionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          disabled={!hasSelection}
        >
          <Icon name="trash-simple" size={20} color={hasSelection ? dangerColor : C.textTertiary} />
          <Text style={[st.actionLabel, { color: hasSelection ? dangerColor : C.textTertiary }]}>
            Löschen
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  cancelBtn:         { minWidth: 72 },
  cancelLabel:       { fontSize: 13, fontWeight: '600' },
  cancelPlaceholder: { minWidth: 72 },
  countLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  verticalSep: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    marginHorizontal: 4,
  },
});
