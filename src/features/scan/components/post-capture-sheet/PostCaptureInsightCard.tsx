import React from 'react';
import { View, Text } from 'react-native';
import { postCaptureSheetStyles as st } from '@/features/scan/components/post-capture-sheet/styles';

interface Props {
  insightText: string;
  dotColor: string;
}

/** Digital Twin ön izleme / varsayılan "hazırlanıyor" metni */
export default function PostCaptureInsightCard({ insightText, dotColor }: Props) {
  return (
    <View style={st.insightCard}>
      <View style={[st.insightDot, { backgroundColor: dotColor }]} />
      <Text style={st.insightText}>{insightText}</Text>
    </View>
  );
}
