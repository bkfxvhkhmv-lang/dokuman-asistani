import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import PremiumModal from '@/design/components/PremiumModal';

interface LoeschenModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  phase?: 'confirm' | 'pending';
  onUndo?: () => void;
}

export default function LoeschenModal({ visible, onClose, onConfirm, phase = 'confirm', onUndo }: LoeschenModalProps) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();

  const handleUndo = onUndo ?? onClose;

  if (phase === 'pending') {
    return (
      <PremiumModal
        visible={visible}
        onClose={handleUndo}
        contentStyle={{ width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: C.bgCard }}
      >
        <View style={{ padding: 24, paddingBottom: 28 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: C.border }} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 }}>
            Dokument wird gelöscht
          </Text>
          <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 18, lineHeight: 18 }}>
            Tippe auf Rückgängig, um den Löschvorgang abzubrechen.
          </Text>
          <TouchableOpacity
            onPress={handleUndo}
            style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.bgInput, marginBottom: 10 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Rückgängig</Text>
          </TouchableOpacity>
        </View>
      </PremiumModal>
    );
  }

  return (
    <PremiumModal visible={visible} onClose={onClose} contentStyle={{ width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: C.bgCard }}>
      <View style={{ padding: 24, paddingBottom: 28 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20, backgroundColor: C.border }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 }}>{T('modal.delete.title')}</Text>
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 18, lineHeight: 18 }}>
          {T('modal.delete.body')}
        </Text>
        <TouchableOpacity onPress={onConfirm}
          style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.danger, marginBottom: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{T('modal.delete.confirm')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}
          style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.bgInput }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{T('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </PremiumModal>
  );
}
