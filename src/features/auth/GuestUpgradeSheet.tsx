import React from 'react';
import { useRouter } from 'expo-router';
import AppBottomSheet from '@/components/AppBottomSheet';
import { useAuth } from '@/providers/AuthContext';
import { useT } from '@/hooks/useT';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function GuestUpgradeSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const { t: T } = useT();

  return (
    <AppBottomSheet
      visible={visible}
      title={T('guest.limit.title')}
      message={T('guest.limit.body')}
      icon="lock-closed-outline"
      tone="warning"
      onClose={onClose}
      actions={[
        {
          label: T('guest.limit.cta_register'),
          variant: 'primary',
          onPress: () => {
            onClose();
            router.push('/login');
          },
        },
        {
          label: T('guest.limit.cta_google'),
          variant: 'secondary',
          onPress: () => {
            onClose();
            void loginWithGoogle();
          },
        },
        {
          label: T('guest.limit.cta_later'),
          variant: 'secondary',
          onPress: onClose,
        },
      ]}
    />
  );
}
