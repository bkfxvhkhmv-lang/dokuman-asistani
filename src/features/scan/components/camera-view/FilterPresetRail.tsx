import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP } from '@/theme';
import { styles } from '@/features/scan/styles';
import { useScanI18n } from '@/hooks/useScanI18n';
import type { FilterPreset } from '@/features/scan/components/camera-view/types';

interface Props {
  topOffset: number;
  activeFilter: string;
  filterPresets: FilterPreset[];
  filterPreviewUri?: string | null;
  isFilterDirty: boolean;
  onFilterChange: (id: string) => void;
  onApplyFilter: () => void;
}

export default function FilterPresetRail({
  topOffset,
  activeFilter,
  filterPresets,
  filterPreviewUri,
  isFilterDirty,
  onFilterChange,
  onApplyFilter,
}: Props) {
  const { t } = useScanI18n();

  return (
    <View style={[styles.filterBar, { top: topOffset }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
        {filterPreviewUri ? (
          <View style={styles.filterPreviewCard}>
            <Image source={{ uri: filterPreviewUri }} style={styles.filterPreviewImage} />
            <View style={styles.filterPreviewOverlay}>
              <Text style={styles.filterPreviewLabel}>{t('scan.preview')}</Text>
              <Text style={styles.filterPreviewValue}>
                {filterPresets.find(f => f.id === activeFilter)?.name || activeFilter}
              </Text>
            </View>
          </View>
        ) : null}

        {filterPresets.map(f => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterBtn, activeFilter === f.id && styles.filterBtnActive]}
            onPress={() => onFilterChange(f.id)}
            hitSlop={HIT_SLOP}
          >
            <Icon name={f.icon} size={12} color="#fff" />
            <Text style={styles.filterText}>{f.name}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.filterApplyBtn, !isFilterDirty && styles.filterApplyBtnDisabled]}
          onPress={onApplyFilter}
          disabled={!isFilterDirty}
          hitSlop={HIT_SLOP}
        >
          <Text style={styles.filterApplyText}>{t('scan.apply')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
