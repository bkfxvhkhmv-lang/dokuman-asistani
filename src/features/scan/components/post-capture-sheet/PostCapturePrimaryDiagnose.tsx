import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Icon from '@/components/Icon';
import { SHEET_CYAN } from '@/features/scan/components/post-capture-sheet/constants';
import { postCaptureSheetStyles as st } from '@/features/scan/components/post-capture-sheet/styles';

interface Props {
  glowOpacity: Animated.Value;
  title: string;
  subtitle: string;
  onDiagnose: () => void;
}

export default function PostCapturePrimaryDiagnose({ glowOpacity, title, subtitle, onDiagnose }: Props) {
  return (
    <View style={st.primaryWrap}>
      <Animated.View
        pointerEvents="none"
        style={[st.primaryGlow, { opacity: glowOpacity }]}
      />
      <TouchableOpacity style={st.primaryBtn} onPress={onDiagnose} activeOpacity={0.82}>
        <View style={st.primaryIconWrap}>
          <Icon name="flash" size={22} color={SHEET_CYAN} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.primaryLabel}>{title}</Text>
          <Text style={st.primarySub}>{subtitle}</Text>
        </View>
        <Icon name="chevron-forward" size={18} color={SHEET_CYAN + '99'} />
      </TouchableOpacity>
    </View>
  );
}
