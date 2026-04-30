import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP } from '@/theme';
import { styles } from '@/features/scan/styles';
import { getBatchPageThumbUri } from '@/features/scan/components/camera-view/utils';
import type { BatchPage } from '@/modules/batch/types';

interface Props {
  bottomOffset: number;
  pages: BatchPage[];
  onRemovePage: (id: string) => void;
  onOpenPageEditor: (id: string) => void;
}

export default function CameraThumbnailStrip({
  bottomOffset,
  pages,
  onRemovePage,
  onOpenPageEditor,
}: Props) {
  return (
    <View style={[styles.thumbnailStrip, { bottom: bottomOffset }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.thumbnailContainer}>
          {pages.map((page, i) => (
            <TouchableOpacity key={page.id} style={styles.thumbnailWrapper} activeOpacity={0.85} onPress={() => onOpenPageEditor(page.id)}>
              <Image source={{ uri: getBatchPageThumbUri(page) }} style={styles.thumbnailImage} />
              <View style={styles.thumbnailBadge}>
                <Text style={styles.thumbnailBadgeText}>{i + 1}</Text>
              </View>
              <TouchableOpacity
                style={styles.thumbnailDelete}
                onPress={() => onRemovePage(page.id)}
                hitSlop={HIT_SLOP}
              >
                <Icon name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
