import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { SECONDARY_ACTIONS } from '@/features/scan/components/post-capture-sheet/constants';
import { postCaptureSheetStyles as st } from '@/features/scan/components/post-capture-sheet/styles';
import type { PostCaptureAction } from '@/features/scan/components/post-capture-sheet/types';

interface Props {
  labels: Record<'add_page' | 'edit', string>;
  onSelect: (action: PostCaptureAction) => void;
}

export default function PostCaptureSecondaryList({ labels, onSelect }: Props) {
  return (
    <View style={st.grid}>
      {SECONDARY_ACTIONS.map(a => (
        <TouchableOpacity
          key={a.id}
          style={st.secondaryRow}
          onPress={() => onSelect(a.id)}
          activeOpacity={0.7}
        >
          <View style={[st.gridIconWrap, { backgroundColor: a.color + '18', borderColor: a.color + '30' }]}>
            <Icon name={a.icon} size={20} color={a.color} />
          </View>
          <Text style={st.gridLabel}>{labels[a.id]}</Text>
          <Icon name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      ))}
    </View>
  );
}
