import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP_LG } from '@/theme';
import { documentPagesViewerStyles as st } from '@/features/detail/components/document-pages-viewer/styles';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function EmptyPagesModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.empty}>
        <Text style={st.emptyText}>Keine Seiten verfügbar</Text>
        <TouchableOpacity onPress={onClose} hitSlop={HIT_SLOP_LG} style={st.emptyClose}>
          <Text style={st.emptyCloseText}>Schließen</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
