import React from 'react';
import { View, Text } from 'react-native';
import { SHEET_CYAN } from '@/features/scan/components/post-capture-sheet/constants';
import { postCaptureSheetStyles as st } from '@/features/scan/components/post-capture-sheet/styles';

interface Props {
  pageLabel: string;
  ocrReadyLabel: string;
  readyTitle: string;
}

export default function PostCaptureHeader({ pageLabel, ocrReadyLabel, readyTitle }: Props) {
  return (
    <View style={st.header}>
      <View style={[st.statusBadge, { borderColor: SHEET_CYAN + '44', backgroundColor: SHEET_CYAN + '14' }]}>
        <View style={[st.statusDot, { backgroundColor: SHEET_CYAN }]} />
        <Text style={[st.statusText, { color: SHEET_CYAN }]}>{pageLabel} · {ocrReadyLabel}</Text>
      </View>
      <Text style={st.title}>{readyTitle}</Text>
    </View>
  );
}
