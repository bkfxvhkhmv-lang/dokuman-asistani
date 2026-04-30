import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP_LG } from '@/theme';
import { documentPagesViewerStyles as st } from '@/features/detail/components/document-pages-viewer/styles';

interface Props {
  paddingTop: number;
  activeIndex: number;
  pageCount: number;
  onClose: () => void;
  onShare: () => void;
}

export default function ViewerTopBar({
  paddingTop,
  activeIndex,
  pageCount,
  onClose,
  onShare,
}: Props) {
  return (
    <View style={[st.topBar, { paddingTop }]}>
      <TouchableOpacity onPress={onClose} hitSlop={HIT_SLOP_LG} style={st.iconBtn}>
        <Icon name="x" size={20} color="#fff" weight="bold" />
      </TouchableOpacity>

      <View style={st.indicator}>
        <Text style={st.indicatorText}>
          {activeIndex + 1} / {pageCount}
        </Text>
      </View>

      <TouchableOpacity onPress={onShare} hitSlop={HIT_SLOP_LG} style={st.iconBtn}>
        <Icon name="share" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
