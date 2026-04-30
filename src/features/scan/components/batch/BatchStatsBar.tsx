/**
 * Hizli istatistik seridi: sayfa sayisi, ortalama kalite, hepsini dondur.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import Icon from '@/components/Icon';
import { SUCCESS, WARNING, DANGER } from '@/features/scan/constants';
import { HIT_SLOP } from '@/theme';
import { batchStyles as st } from '@/features/scan/components/batch/styles';
import type { T } from '@/features/scan/components/batch/types';

interface Props {
  pageCount: number;
  avgQuality: number | null;
  onRotateAll?: () => void;
  t: T;
}

export default function BatchStatsBar({ pageCount, avgQuality, onRotateAll, t }: Props) {
  return (
    <View style={st.statsBar}>
      <View style={st.statItem}>
        <Icon name="files" size={13} color="#aaa" />
        <Text style={st.statText}>{pageCount} {t('scan.pages')}</Text>
      </View>

      {avgQuality !== null && (
        <View style={st.statItem}>
          <View
            style={[
              st.qualityDotCircle,
              {
                backgroundColor:
                  avgQuality >= 75 ? SUCCESS :
                  avgQuality >= 45 ? WARNING : DANGER,
              },
            ]}
          />
          <Text style={st.statText}>Ø {avgQuality}</Text>
        </View>
      )}

      {onRotateAll && (
        <TouchableOpacity
          style={st.statItem}
          onPress={() => { onRotateAll(); Haptics.selectionAsync(); }}
          hitSlop={HIT_SLOP}
        >
          <Icon name="arrow-clockwise" size={13} color="#aaa" />
          <Text style={st.statText}>{t('scan.rotate_all')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
