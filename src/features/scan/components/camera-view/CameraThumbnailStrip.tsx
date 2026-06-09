import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Animated } from 'react-native';
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

function NewThumbWrapper({ children }: { children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(0.65)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 13, stiffness: 220 }).start();
  }, [scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

export default function CameraThumbnailStrip({
  bottomOffset,
  pages,
  onRemovePage,
  onOpenPageEditor,
}: Props) {
  const [newestId, setNewestId] = useState<string | null>(null);
  const prevLengthRef = useRef(pages.length);

  useEffect(() => {
    if (pages.length > prevLengthRef.current && pages.length > 0) {
      setNewestId(pages[pages.length - 1].id);
    }
    prevLengthRef.current = pages.length;
  }, [pages]);

  return (
    <View style={[styles.thumbnailStrip, { bottom: bottomOffset }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.thumbnailContainer}>
          {pages.map((page, i) => {
            const inner = (
              <TouchableOpacity
                style={styles.thumbnailWrapper}
                activeOpacity={0.85}
                onPress={() => onOpenPageEditor(page.id)}
              >
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
            );

            return page.id === newestId ? (
              <NewThumbWrapper key={page.id}>{inner}</NewThumbWrapper>
            ) : (
              <View key={page.id}>{inner}</View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
