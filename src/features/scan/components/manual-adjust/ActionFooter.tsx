/**
 * Manual Adjust dipteki Cancel/Apply aksiyonlari.
 *
 * Apply butonu commit basladiginda spinner gosterir; iki kez basilmasin
 * diye disabled olur.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { HIT_SLOP } from '@/theme';
import { adjustStyles as st } from '@/features/scan/components/manual-adjust/styles';
import type { T } from '@/features/scan/components/manual-adjust/types';

interface Props {
  committing: boolean;
  onCancel: () => void;
  onApply: () => void;
  t: T;
}

export default function ActionFooter({ committing, onCancel, onApply, t }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.footer, { paddingBottom: Math.max(12, insets.bottom + 6) }]}>
      <TouchableOpacity onPress={onCancel} style={st.cancelBtn} hitSlop={HIT_SLOP}>
        <Text style={st.cancelText}>{t('scan.cancel')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onApply}
        disabled={committing}
        style={[st.applyBtn, committing && st.applyBtnDisabled]}
        hitSlop={HIT_SLOP}
      >
        {committing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Icon name="check" size={16} color="#fff" weight="bold" />
            <Text style={st.applyText}>{t('scan.adjust_apply')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
