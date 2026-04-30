import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP_LG } from '@/theme';
import { advancedBatchStyles as st } from '@/features/scan/components/advanced-batch/styles';

interface Props {
  title: string;
  onBack: () => void;
  undoEnabled: boolean;
  onUndo: () => void;
}

export default function AdvancedBatchHeader({ title, onBack, undoEnabled, onUndo }: Props) {
  return (
    <View style={st.header}>
      <TouchableOpacity style={st.iconBtn} onPress={onBack} hitSlop={HIT_SLOP_LG}>
        <Icon name="arrow-left" size={18} color="#fff" />
      </TouchableOpacity>
      <Text style={st.title}>{title}</Text>
      <TouchableOpacity
        style={[st.iconBtn, !undoEnabled && { opacity: 0.35 }]}
        onPress={onUndo}
        disabled={!undoEnabled}
        hitSlop={HIT_SLOP_LG}
      >
        <Icon name="arrow-counter-clockwise" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
