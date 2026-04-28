import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles';
import { ACCENT, BG_PROCESSING } from '../constants';

interface Props {
  pageCount: number;
}

export default function AnalysisView({ pageCount }: Props) {
  return (
    <SafeAreaView style={[styles.fill, styles.centerContent, { backgroundColor: BG_PROCESSING }]}>
      <ActivityIndicator size="large" color={ACCENT} />
      <Text style={styles.processingTitle}>Vision API OCR läuft</Text>
      <Text style={styles.processingSubtitle}>{pageCount} Seiten werden verarbeitet…</Text>
    </SafeAreaView>
  );
}
