import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ACCENT } from '@/features/scan/constants';
import { HIT_SLOP_LG } from '@/theme';
import Icon from '@/components/Icon';
import { styles } from '@/features/scan/styles';

interface Props {
  paddingTop: number;
  title: string;
  reviewHint?: string;
  continueLabel: string;
  showContinue: boolean;
  onBack: () => void;
  onDone?: () => void;
  quality?: number | null;
}

export default function EditViewHeader({
  paddingTop,
  title,
  reviewHint,
  continueLabel,
  showContinue,
  onBack,
  onDone,
  quality,
}: Props) {
  return (
    <View style={{ paddingTop }}>
      <View style={styles.editHeader}>
        <TouchableOpacity style={styles.controlBtn} onPress={onBack} hitSlop={HIT_SLOP_LG}>
          <Icon name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.editTitle}>{title}</Text>
        <View style={{ minWidth: 52, alignItems: 'flex-end', justifyContent: 'center' }}>
          {showContinue && onDone ? (
            <TouchableOpacity
              onPress={onDone}
              hitSlop={HIT_SLOP_LG}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: `${ACCENT}22`,
                borderWidth: 1,
                borderColor: `${ACCENT}55`,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>{continueLabel}</Text>
            </TouchableOpacity>
          ) : typeof quality === 'number' ? (
            <Text style={{
              fontSize: 13,
              fontWeight: '700',
              color: quality >= 75 ? '#34D399' : quality >= 45 ? '#FBBF24' : '#F87171',
            }}>
              {Math.round(quality)}%
            </Text>
          ) : null}
        </View>
      </View>
      {reviewHint ? (
        <Text style={{
          textAlign: 'center',
          fontSize: 12,
          fontWeight: '500',
          color: 'rgba(255,255,255,0.52)',
          paddingBottom: 6,
        }}>
          {reviewHint}
        </Text>
      ) : null}
    </View>
  );
}
