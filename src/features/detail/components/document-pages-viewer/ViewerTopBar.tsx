import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { HIT_SLOP_LG } from '@/theme';
import { documentPagesViewerStyles as st } from '@/features/detail/components/document-pages-viewer/styles';

interface Props {
  activeIndex: number;
  pageCount: number;
  onClose: () => void;
  onShare: () => void;
  onRotate?: () => void;
}

export default function ViewerTopBar({ activeIndex, pageCount, onClose, onShare, onRotate }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.topBarSafeWrapper, { paddingTop: insets.top }]}>
      <View style={st.topBar}>
        <TouchableOpacity onPress={onClose} hitSlop={HIT_SLOP_LG} style={st.iconBtn}>
          <Icon name="x" size={22} color="#fff" weight="bold" />
        </TouchableOpacity>

        <View style={st.indicator}>
          <Text style={st.indicatorText}>
            {activeIndex + 1} / {pageCount}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {onRotate && (
            <TouchableOpacity onPress={onRotate} hitSlop={HIT_SLOP_LG} style={st.iconBtn}
              accessibilityLabel="Drehen" accessibilityRole="button">
              <Icon name="arrow-clockwise" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onShare} hitSlop={HIT_SLOP_LG} style={st.iconBtn}>
            <Icon name="share" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
