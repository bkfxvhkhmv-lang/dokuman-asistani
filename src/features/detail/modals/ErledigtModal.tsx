import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../ThemeContext';
import { UISoundService } from '../../../services/UISoundService';
import { useThrottledPress } from '../../../hooks/useThrottledPress';

const UNDO_SECONDS = 10;

interface ErledigtModalProps {
  visible: boolean;
  onClose: () => void;
  erledigt?: boolean;
  betrag?: number | null;
  onConfirm: () => void;
  onUndo?: () => void;
}

export default function ErledigtModal({
  visible, onClose, erledigt, betrag, onConfirm, onUndo,
}: ErledigtModalProps) {
  const { Colors: C } = useTheme();
  const [phase, setPhase]       = useState<'confirm' | 'undo'>('confirm');
  const [countdown, setCountdown] = useState(UNDO_SECONDS);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) { setPhase('confirm'); setCountdown(UNDO_SECONDS); }
  }, [visible]);

  // Countdown tick
  useEffect(() => {
    if (phase !== 'undo') return;
    if (countdown <= 0) { onClose(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, onClose]);

  const handleConfirm = useThrottledPress(() => {
    UISoundService.success();
    onConfirm();
    if (!erledigt) {
      setPhase('undo'); // show countdown for "mark done" only
    } else {
      onClose();        // "re-open" is instant, no undo needed
    }
  }, 1000);

  const handleUndo = () => {
    onUndo?.();
    onClose();
  };

  // ── Undo countdown phase ──────────────────────────────────────────────────
  if (phase === 'undo') {
    const savings = betrag && betrag > 0
      ? ` · ${betrag.toFixed(2).replace('.', ',')} € abgehakt`
      : '';
    return (
      <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={{
          backgroundColor: C.bgCard,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 20, paddingBottom: 36,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <View style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: `${C.success}18`,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 22 }}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>
              Erledigt{savings}
            </Text>
            <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
              Automatisch geschlossen in {countdown}s
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleUndo}
            style={{
              paddingHorizontal: 14, paddingVertical: 10,
              borderRadius: 10, borderWidth: 1,
              borderColor: C.border, backgroundColor: C.bgInput,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Rückgängig</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // ── Confirm phase ─────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: C.border }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 }}>
          {erledigt ? 'Dokument wieder öffnen' : 'Dokument als erledigt markieren'}
        </Text>
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 18, lineHeight: 18 }}>
          {erledigt
            ? 'Dieses Dokument wird wieder als offen markiert.'
            : 'Dieses Dokument wird als erledigt markiert.'}
        </Text>
        <TouchableOpacity
          onPress={handleConfirm}
          style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: erledigt ? C.warning : C.success, marginBottom: 10 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
            {erledigt ? 'Als offen markieren' : 'Als erledigt markieren'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}
          style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.border }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Abbrechen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
