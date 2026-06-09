import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { HIT_SLOP } from '@/theme';
import { styles } from '@/features/scan/styles';
import { useScanI18n } from '@/hooks/useScanI18n';
import { useScan } from '@/features/scan/context/ScanContext';
import { QUALITY_PRESET_ROWS } from '@/features/scan/components/camera-view/constants';

interface Props {
  topOffset: number;
}

export default function QualityPresetStrip({ topOffset }: Props) {
  const { t } = useScanI18n();
  const { qualityPreset, setQualityPreset } = useScan();

  return (
    <View style={[styles.filterBar, { top: topOffset, paddingVertical: 8 }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
        {QUALITY_PRESET_ROWS.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.filterBtn, qualityPreset === p.id && styles.filterBtnActive]}
            onPress={() => setQualityPreset(p.id)}
            hitSlop={HIT_SLOP}
          >
            <Text style={styles.filterText}>{t(p.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
