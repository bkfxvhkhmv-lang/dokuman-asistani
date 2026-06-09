import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { HIT_SLOP } from '@/theme';
import type { UndoEntry } from '@/features/scan/components/advanced-batch/types';
import { advancedBatchStyles as st } from '@/features/scan/components/advanced-batch/styles';

interface Props {
  undoEntry: UndoEntry;
  nowMs: number;
  undoLabel: string;
  onUndo: () => void;
}

export default function AdvancedBatchUndoBar({
  undoEntry,
  nowMs,
  undoLabel,
  onUndo,
}: Props) {
  return (
    <View style={st.undoBar}>
      <View style={{ flex: 1 }}>
        <Text style={st.undoTitle}>{undoEntry.message}</Text>
        <Text style={st.undoHint}>
          {undoEntry.hint} ({Math.max(0, Math.ceil((undoEntry.expiresAt - nowMs) / 1000))} sn)
        </Text>
      </View>
      <TouchableOpacity style={st.undoBtn} onPress={onUndo} hitSlop={HIT_SLOP}>
        <Text style={st.undoBtnText}>{undoLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
