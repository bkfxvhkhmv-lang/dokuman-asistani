/**
 * Toplu filtre seridi — secilen filtre tum sayfalara uygulanir.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP } from '@/theme';
import { batchStyles as st } from '@/features/scan/components/batch/styles';
import type { FilterPreset, T } from '@/features/scan/components/batch/types';

interface Props {
  presets: FilterPreset[];
  activeId: string;
  onSelect: (id: string) => void;
  t: T;
}

export default function BatchFilterStrip({ presets, activeId, onSelect, t }: Props) {
  return (
    <View style={st.batchFilterWrap}>
      <Text style={st.batchFilterLabel}>{t('scan.filter_all_pages')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {presets.map(preset => {
          const active = activeId === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              onPress={() => onSelect(preset.id)}
              style={[
                st.batchFilterChip,
                active && { borderColor: preset.color, backgroundColor: `${preset.color}22` },
              ]}
              hitSlop={HIT_SLOP}
            >
              <Icon name={preset.icon} size={12} color={active ? preset.color : '#aaa'} />
              <Text style={[st.batchFilterChipText, active && { color: preset.color }]}>
                {preset.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
