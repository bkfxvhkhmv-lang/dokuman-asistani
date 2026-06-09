import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Icon from '@/components/Icon';
import { DANGER } from '@/features/scan/constants';
import { HIT_SLOP_LG } from '@/theme';
import { advancedBatchStyles as st } from '@/features/scan/components/advanced-batch/styles';

interface Props {
  index: number;
  totalRows: number;
  uri: string;
  selected: boolean;
  pageLabel: string;
  subLabel: string;
  onToggleSelect: () => void;
  onLongPressEditor: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export default function AdvancedBatchPageRow({
  index,
  totalRows,
  uri,
  selected,
  pageLabel,
  subLabel,
  onToggleSelect,
  onLongPressEditor,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) {
  return (
    <TouchableOpacity
      style={[st.row, selected && st.rowSelected]}
      onPress={onToggleSelect}
      onLongPress={onLongPressEditor}
    >
      <Image source={{ uri }} style={st.thumb} />
      <View style={{ flex: 1 }}>
        <Text style={st.rowTitle}>{pageLabel}</Text>
        <Text style={st.rowSub}>{subLabel}</Text>
      </View>
      <View style={st.rowBtns}>
        <TouchableOpacity
          style={[st.iconBtn, index === 0 && st.disabled]}
          disabled={index === 0}
          onPress={onMoveUp}
          hitSlop={{ top: 14, bottom: 6, left: 14, right: 14 }}
        >
          <Icon name="arrow-up" size={14} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.iconBtn, index === totalRows - 1 && st.disabled]}
          disabled={index === totalRows - 1}
          onPress={onMoveDown}
          hitSlop={{ top: 6, bottom: 14, left: 14, right: 14 }}
        >
          <Icon name="arrow-down" size={14} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={st.iconBtn} onPress={onRemove} hitSlop={HIT_SLOP_LG}>
          <Icon name="trash" size={14} color={DANGER} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
