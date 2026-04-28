import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, PanResponder, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import { exportiereTopluPDF } from '../utils';
import { uploadDocumentV4 } from '../services/v4Api';
import type { Dokument } from '../store';

const ITEM_H = 60;

interface PdfMergeDragModalProps {
  visible: boolean;
  items: Dokument[];
  onClose: () => void;
  onDone?: () => void;
}

export default function PdfMergeDragModal({ visible, items, onClose, onDone }: PdfMergeDragModalProps) {
  const { Colors, S, R, Shadow } = useTheme();
  const C = Colors;

  const [reihenfolge, setReihenfolge] = useState<Dokument[]>(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragY    = useRef(new Animated.Value(0)).current;
  const dragBase = useRef(0);
  const listRef  = useRef(reihenfolge);
  listRef.current = reihenfolge;

  React.useEffect(() => { setReihenfolge(items); }, [items]);

  const makePanResponder = useCallback((index: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        dragBase.current = index * ITEM_H;
        dragY.setValue(dragBase.current);
        setDragIndex(index);
      },
      onPanResponderMove: (_, gs) => {
        dragY.setValue(dragBase.current + gs.dy);
        const newIndex = Math.max(0, Math.min(listRef.current.length - 1,
          Math.round((dragBase.current + gs.dy) / ITEM_H)));
        if (newIndex !== index) {
          const next = [...listRef.current];
          const [moved] = next.splice(index, 1);
          next.splice(newIndex, 0, moved);
          dragBase.current = newIndex * ITEM_H;
          dragY.setValue(dragBase.current);
          setReihenfolge(next);
          setDragIndex(newIndex);
        }
      },
      onPanResponderRelease: () => {
        dragY.setValue(0);
        setDragIndex(null);
      },
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    onClose();
    const uri = await exportiereTopluPDF(reihenfolge);
    if (uri) {
      const filename = `merged_${Date.now()}.pdf`;
      uploadDocumentV4(uri, filename).catch(() => null);
    }
    onDone?.();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[st.sheet, { backgroundColor: C.bgCard }]}>
        <View style={[st.handle, { backgroundColor: C.border }]} />
        <Text style={[st.title, { color: C.text }]}>PDF zusammenführen</Text>
        <Text style={[st.hint, { color: C.textSecondary }]}>☰ Satırı basılı tutup sürükleyin</Text>
        <View style={{ height: Math.min(reihenfolge.length * ITEM_H, ITEM_H * 6), marginBottom: 16 }}>
          {reihenfolge.map((dok, i) => {
            const isDragging = dragIndex === i;
            const panHandlers = makePanResponder(i).panHandlers;
            return (
              <Animated.View key={dok.id}
                style={[st.row, {
                  backgroundColor: isDragging ? C.primaryLight : C.bgCard,
                  borderColor: isDragging ? C.primary : C.border,
                  zIndex: isDragging ? 99 : 1,
                  elevation: isDragging ? 8 : 1,
                }, isDragging && Shadow.md]}
                {...panHandlers}>
                <View style={[st.badge, { backgroundColor: isDragging ? C.primary : C.primaryLight }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDragging ? '#fff' : C.primaryDark }}>{i + 1}</Text>
                </View>
                <Text style={[st.rowTitle, { color: C.text }]} numberOfLines={1}>{dok.titel}</Text>
                <Text style={{ fontSize: 18, color: C.textTertiary, paddingHorizontal: 4 }}>☰</Text>
              </Animated.View>
            );
          })}
        </View>
        <TouchableOpacity style={[st.btn, { backgroundColor: C.primary }]} onPress={handleExport}>
          <Text style={st.btnText}> {reihenfolge.length} Dokumente als PDF exportieren</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:    { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  hint:     { fontSize: 12, marginBottom: 16 },
  row:      { height: ITEM_H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  badge:    { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontSize: 13, fontWeight: '500' },
  btn:      { borderRadius: 12, padding: 14, alignItems: 'center' },
  btnText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
});
