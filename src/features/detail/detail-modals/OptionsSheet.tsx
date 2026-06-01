import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { AppSheet } from '@/design/components';
import type { ModalData } from '@/features/detail/hooks/useModalController';

interface Props {
  visible: boolean;
  onClose: () => void;
  data: ModalData | undefined;
}

export default function OptionsSheet({ visible, onClose, data }: Props) {
  const { Colors: C } = useTheme();
  const options = data?.options || [];

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title={data?.title || 'Auswahl'}
      subtitle={data?.message || ''}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 4 }}
      >
        {options.map((option, index) => (
          <TouchableOpacity
            key={`${option.text}-${index}`}
            onPress={() => { onClose(); option.onPress?.(); }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 14,
              borderBottomWidth: index < options.length - 1 ? 0.5 : 0,
              borderBottomColor: C.border,
            }}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: option.style === 'cancel' ? '600' : '500',
              color: option.style === 'destructive' ? C.danger : C.text,
            }}>
              {option.text}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </AppSheet>
  );
}
