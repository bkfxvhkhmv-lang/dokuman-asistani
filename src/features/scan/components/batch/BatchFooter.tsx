/**
 * Batch view footer: birincil "Sonraki adim" CTA + sayfa ekleme.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP } from '@/theme';
import { batchStyles as st } from '@/features/scan/components/batch/styles';
import type { T } from '@/features/scan/components/batch/types';

interface Props {
  pageCount: number;
  onNext: () => void;
  onAddPage: () => void;
  t: T;
}

export default function BatchFooter({ pageCount, onNext, onAddPage, t }: Props) {
  const disabled = pageCount === 0;
  return (
    <View style={st.footer}>
      <TouchableOpacity
        style={[st.primaryBtn, disabled && { opacity: 0.4 }]}
        onPress={onNext}
        disabled={disabled}
        hitSlop={HIT_SLOP}
      >
        <Icon name="flash" size={18} color="#fff" />
        <Text style={st.primaryBtnText}>{t('scan.next_step')}</Text>
      </TouchableOpacity>

      <View style={st.footerRow}>
        <TouchableOpacity
          style={[st.secondaryBtn, { flex: 1 }]}
          onPress={onAddPage}
          hitSlop={HIT_SLOP}
        >
          <Icon name="camera" size={15} color="rgba(255,255,255,0.7)" />
          <Text style={st.secondaryBtnText}>{t('scan.add_page')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
