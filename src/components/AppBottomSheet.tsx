import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../ThemeContext';

type Tone = 'default' | 'success' | 'warning' | 'danger';

interface SheetAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface AppBottomSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: string;
  tone?: Tone;
  actions?: SheetAction[];
  onClose: () => void;
}

export default function AppBottomSheet({
  visible, title, message, icon = 'information-circle-outline',
  tone = 'default', actions = [], onClose,
}: AppBottomSheetProps) {
  const { Colors } = useTheme();

  const toneMap: Record<Tone, { bg: string; fg: string }> = {
    default: { bg: Colors.primaryLight, fg: Colors.primary },
    success: { bg: Colors.successLight, fg: Colors.success },
    warning: { bg: Colors.warningLight, fg: Colors.warning },
    danger:  { bg: Colors.dangerLight,  fg: Colors.danger },
  };
  const toneStyle = toneMap[tone] || toneMap.default;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={st.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={[st.sheet, { backgroundColor: Colors.bgCard, borderTopColor: Colors.border }]}>
        <View style={[st.handle, { backgroundColor: Colors.border }]} />
        <View style={[st.iconWrap, { backgroundColor: toneStyle.bg }]}>
          <Icon name={icon} size={22} color={toneStyle.fg} />
        </View>
        <Text style={[st.title, { color: Colors.text }]}>{title}</Text>
        {!!message && <Text style={[st.message, { color: Colors.textSecondary }]}>{message}</Text>}
        <View style={st.actions}>
          {actions.map((action, index) => {
            const variant = action.variant || (index === 0 && actions.length === 1 ? 'primary' : 'secondary');
            const isPrimary = variant === 'primary';
            const isDanger  = variant === 'danger';
            return (
              <TouchableOpacity key={`${action.label}-${index}`}
                style={[st.actionBtn, { backgroundColor: isPrimary ? Colors.primary : Colors.bg, borderColor: isDanger ? Colors.danger : Colors.border }]}
                onPress={action.onPress}>
                <Text style={[st.actionText, { color: isPrimary ? '#fff' : isDanger ? Colors.danger : Colors.textSecondary }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34, borderTopWidth: 1 },
  handle:     { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  iconWrap:   { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 },
  title:      { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message:    { fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 18, textAlign: 'center' },
  actions:    { gap: 10, marginTop: 4 },
  actionBtn:  { borderRadius: 16, borderWidth: 1, paddingVertical: 15, alignItems: 'center' },
  actionText: { fontSize: 14, fontWeight: '700' },
});
