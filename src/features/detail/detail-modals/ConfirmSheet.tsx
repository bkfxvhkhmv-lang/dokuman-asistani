import React from 'react';
import { View } from 'react-native';
import { AppSheet, AppButton } from '@/design/components';
import type { ModalData } from '@/features/detail/hooks/useModalController';

interface Props {
  visible: boolean;
  onClose: () => void;
  data: ModalData | undefined;
}

export default function ConfirmSheet({ visible, onClose, data }: Props) {
  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title={data?.title || 'Bestätigung'}
      subtitle={data?.message || ''}
      footer={
        <View style={{ gap: 8 }}>
          {(data?.actions || []).map((action, index) => (
            <AppButton
              key={`${action.text}-${index}`}
              label={action.text}
              variant={action.style === 'destructive' ? 'danger' : action.style === 'cancel' ? 'secondary' : 'primary'}
              onPress={() => { onClose(); action.onPress?.(); }}
            />
          ))}
        </View>
      }
    />
  );
}
