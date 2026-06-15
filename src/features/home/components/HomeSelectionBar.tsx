import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import type { ThemeColors } from '@/ThemeContext';
import { useT } from '@/hooks/useT';

const BOTTOM_CLEARANCE = 12; // tab bar is hidden while selection bar is visible

type Props = {
  count: number;
  onAbbrechen: () => void;
  onExport: () => void;
  onSteuerpaket: () => void;
  onLoeschen: () => void;
  C: ThemeColors;
};

export default function HomeSelectionBar({
  count, onAbbrechen, onExport, onSteuerpaket, onLoeschen, C,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t: T } = useT();
  const hasSelection = count > 0;
  const label = T('home.selection_count', { n: count });
  const [overflowVisible, setOverflowVisible] = useState(false);

  const openOverflow  = () => setOverflowVisible(true);
  const closeOverflow = () => setOverflowVisible(false);

  const handleSteuerpaket = () => { closeOverflow(); onSteuerpaket(); };
  const handleLoeschen    = () => { closeOverflow(); onLoeschen(); };

  return (
    <>
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
        <View style={st.headerRow}>
          <TouchableOpacity
            onPress={onAbbrechen}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={st.headerSide}
            accessibilityRole="button"
            accessibilityLabel={T('common.cancel')}
          >
            <Text style={[st.cancelLabel, { color: C.textSecondary }]}>
              {T('common.cancel')}
            </Text>
          </TouchableOpacity>

          <Text style={[st.countLabel, { color: C.text }]} numberOfLines={1}>
            {label}
          </Text>

          <TouchableOpacity
            onPress={openOverflow}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[st.headerSide, st.headerSideRight]}
            accessibilityRole="button"
            accessibilityLabel="Weitere Optionen"
          >
            <Text style={[st.optionenLabel, { color: C.primary }]}>Optionen</Text>
          </TouchableOpacity>
        </View>

        <View style={[st.divider, { backgroundColor: C.border }]} />

        <TouchableOpacity
          onPress={onExport}
          disabled={!hasSelection}
          activeOpacity={0.85}
          style={[
            st.exportBtn,
            { backgroundColor: C.primary, opacity: hasSelection ? 1 : 0.45 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Als PDF exportieren"
          accessibilityState={{ disabled: !hasSelection }}
        >
          <Icon name="upload-simple" size={18} color="#fff" />
          <Text style={st.exportBtnText}>Als PDF exportieren</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={overflowVisible}
        transparent
        animationType="fade"
        onRequestClose={closeOverflow}
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={closeOverflow} />
        <View style={[st.overflowSheet, { backgroundColor: C.bgCard, paddingBottom: insets.bottom + 8 }]}>
          <View style={[st.overflowHandle, { backgroundColor: C.border }]} />
          <Text style={[st.sheetTitle, { color: C.textSecondary }]}>Weitere Optionen</Text>

          <TouchableOpacity
            style={[st.overflowRow, { borderBottomColor: C.borderLight }]}
            onPress={handleSteuerpaket}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Icon name="folder-open" size={20} color={C.primary} />
            <Text style={[st.overflowLabel, { color: C.text }]}>Steuerpaket vorbereiten</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={st.overflowRow}
            onPress={handleLoeschen}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Icon name="trash-simple" size={20} color={C.danger} />
            <Text style={[st.overflowLabel, { color: C.danger }]}>Dokumente löschen</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerSide: {
    minWidth: 56,
    minHeight: 36,
    justifyContent: 'center',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  cancelLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  optionenLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  countLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  exportBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exportBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overflowSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 0,
  },
  overflowHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  overflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 17,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  overflowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});
