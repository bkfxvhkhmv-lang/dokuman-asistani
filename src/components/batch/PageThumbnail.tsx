import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '../Icon';
import { BatchPage } from '../../modules/batch';

interface Props {
  page: BatchPage;
  index: number;
  onPress: () => void;
  onDelete: () => void;
  onRotate: () => void;
  isSelected?: boolean;
}

export const PageThumbnail: React.FC<Props> = ({
  page,
  index,
  onPress,
  onDelete,
  onRotate,
  isSelected = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={{ uri: page.uri }} style={styles.image} />

      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{index + 1}</Text>
      </View>

      {page.filter && page.filter !== 'original' && (
        <View style={styles.filterBadge}>
          <Text style={styles.filterText}>{page.filter}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onRotate}>
          <Icon name="refresh" size={14} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
          <Icon name="trash" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: '#22C55E',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  numberBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(34,197,94,0.8)',
  },
  filterText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  actions: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.8)',
  },
});
