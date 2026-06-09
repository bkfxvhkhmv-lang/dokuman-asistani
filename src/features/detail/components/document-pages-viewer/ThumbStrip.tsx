import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import type { ScannedPage } from '@/store';
import { documentPagesViewerStyles as st } from '@/features/detail/components/document-pages-viewer/styles';

interface Props {
  sortedPages: ScannedPage[];
  active: number;
  missingPages: Set<string>;
  paddingBottom: number;
  onPickIndex: (index: number) => void;
}

export default function ThumbStrip({
  sortedPages,
  active,
  missingPages,
  paddingBottom,
  onPickIndex,
}: Props) {
  return (
    <View style={[st.thumbStrip, { paddingBottom }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.thumbStripInner}
      >
        {sortedPages.map((page, idx) => {
          const isActive = idx === active;
          const isMissing = missingPages.has(page.id);
          return (
            <TouchableOpacity
              key={page.id}
              onPress={() => onPickIndex(idx)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={[st.thumb, isActive && st.thumbActive]}
            >
              {isMissing ? (
                <View style={[st.thumbImage, st.thumbMissing]}>
                  <Icon name="alert-circle" size={14} color="#F87171" />
                </View>
              ) : (
                <Image source={{ uri: page.uri }} style={st.thumbImage} resizeMode="cover" />
              )}
              <View style={st.thumbBadge}>
                <Text style={st.thumbBadgeText}>{idx + 1}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
