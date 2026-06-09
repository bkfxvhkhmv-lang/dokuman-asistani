import React from 'react';
import { AppSheet, AppButton } from '@/design/components';
import type { ModalData } from '@/features/detail/hooks/useModalController';

interface Props {
  visible: boolean;
  onClose: () => void;
  data: ModalData | undefined;
}

export default function NoticeSheet({ visible, onClose, data }: Props) {
  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title={data?.title || 'Hinweis'}
      subtitle={data?.message || ''}
      footer={<AppButton label="Verstanden" onPress={onClose} />}
    />
  );
}
