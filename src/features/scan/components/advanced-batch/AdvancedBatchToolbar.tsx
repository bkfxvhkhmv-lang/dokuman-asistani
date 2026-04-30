import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP } from '@/theme';
import { advancedBatchStyles as st } from '@/features/scan/components/advanced-batch/styles';

interface Props {
  isMultiPage: boolean;
  hasSelection: boolean;
  labels: {
    selectAll: string;
    clearSelection: string;
    delete: string;
    rotateSelected: string;
    duplicateSelected: string;
    extractSelected: string;
    multiPageHint: string;
  };
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onRotateSelected: () => void;
  onDuplicateSelected: () => void;
  onExtractSelected: () => void;
}

export default function AdvancedBatchToolbar(props: Props) {
  const {
    isMultiPage,
    hasSelection,
    labels,
    onSelectAll,
    onClearSelection,
    onDeleteSelected,
    onRotateSelected,
    onDuplicateSelected,
    onExtractSelected,
  } = props;

  return (
    <>
      {!isMultiPage && (
        <View style={st.infoBox}>
          <Text style={st.infoText}>{labels.multiPageHint}</Text>
        </View>
      )}

      <View style={st.actionsRow}>
        <TouchableOpacity
          style={st.smallBtn}
          onPress={onSelectAll}
          disabled={!isMultiPage}
          hitSlop={HIT_SLOP}
        >
          <Text style={st.smallBtnText}>{labels.selectAll}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.smallBtn} onPress={onClearSelection} hitSlop={HIT_SLOP}>
          <Text style={st.smallBtnText}>{labels.clearSelection}</Text>
        </TouchableOpacity>
      </View>

      <View style={st.actionsRow}>
        <TouchableOpacity
          style={[st.actionBtn, !hasSelection && st.disabled]}
          disabled={!hasSelection}
          onPress={onDeleteSelected}
          hitSlop={HIT_SLOP}
        >
          <Icon name="trash" size={16} color="#fff" />
          <Text style={st.actionText}>{labels.delete}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.actionBtn, !hasSelection && st.disabled]}
          disabled={!hasSelection}
          onPress={onRotateSelected}
          hitSlop={HIT_SLOP}
        >
          <Icon name="arrow-clockwise" size={16} color="#fff" />
          <Text style={st.actionText}>{labels.rotateSelected}</Text>
        </TouchableOpacity>
      </View>

      <View style={st.actionsRow}>
        <TouchableOpacity
          style={[st.actionBtn, !hasSelection && st.disabled]}
          disabled={!hasSelection}
          onPress={onDuplicateSelected}
          hitSlop={HIT_SLOP}
        >
          <Icon name="copy" size={16} color="#fff" />
          <Text style={st.actionText}>{labels.duplicateSelected}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.actionBtn, (!hasSelection || !isMultiPage) && st.disabled]}
          disabled={!hasSelection || !isMultiPage}
          onPress={onExtractSelected}
          hitSlop={HIT_SLOP}
        >
          <Icon name="git-branch" size={16} color="#fff" />
          <Text style={st.actionText}>{labels.extractSelected}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
