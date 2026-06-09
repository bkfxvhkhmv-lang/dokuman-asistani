import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { HIT_SLOP } from '@/theme';
import Icon from '@/components/Icon';
import { editViewStyles as st } from '@/features/scan/components/edit-view/styles';

interface Props {
  paddingBottom: number;
  showOriginal: boolean;
  onSelectOriginal: () => void;
  onSelectOptimized: () => void;
  onRevert?: () => void;
  onAccept?: () => void;
  labelOriginal: string;
  labelEnhanced: string;
  labelHint: string;
  labelUndo: string;
  labelKeep: string;
}

export default function CompareOptimizeBar(props: Props) {
  const {
    paddingBottom,
    showOriginal,
    onSelectOriginal,
    onSelectOptimized,
    onRevert,
    onAccept,
    labelOriginal,
    labelEnhanced,
    labelHint,
    labelUndo,
    labelKeep,
  } = props;

  return (
    <View style={[st.compareBar, { paddingBottom }]}>
      <View style={st.compareToggleRow}>
        <TouchableOpacity
          style={[st.toggleChip, showOriginal && st.toggleChipActive]}
          onPress={onSelectOriginal}
          hitSlop={HIT_SLOP}
        >
          <Text style={[st.toggleChipText, showOriginal && { color: '#fff' }]}>{labelOriginal}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.toggleChip, !showOriginal && st.toggleChipOptimized]}
          onPress={onSelectOptimized}
          hitSlop={HIT_SLOP}
        >
          <Icon name="sparkle" size={12} color={!showOriginal ? '#fff' : 'rgba(255,255,255,0.5)'} weight="fill" />
          <Text style={[st.toggleChipText, !showOriginal && { color: '#fff' }]}>{labelEnhanced}</Text>
        </TouchableOpacity>
      </View>
      {!showOriginal && (
        <Text style={st.optimizeHint}>{labelHint}</Text>
      )}
      <View style={st.compareActionRow}>
        <TouchableOpacity style={st.revertBtn} onPress={onRevert} disabled={!onRevert} hitSlop={HIT_SLOP}>
          <Icon name="arrow-left" size={15} color="#F87171" />
          <Text style={st.revertText}>{labelUndo}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.acceptBtn} onPress={onAccept} disabled={!onAccept} hitSlop={HIT_SLOP}>
          <Icon name="check" size={16} color="#fff" weight="bold" />
          <Text style={st.acceptText}>{labelKeep}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
