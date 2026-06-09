/**
 * Draggable batch page row — long-press drag handle to reorder.
 *
 * Uses react-native-gesture-handler (GestureDetector + Gesture.Pan)
 * and Reanimated 4 for a smooth, native-thread drag animation.
 *
 * Architecture: each row manages its own translateY SharedValue.
 * When drag displacement exceeds COMMIT_THRESHOLD the parent is notified
 * via onMoveUp / onMoveDown and the animation snaps back to 0.
 */
import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Icon from '@/components/Icon';
import { DANGER } from '@/features/scan/constants';
import { HIT_SLOP_LG } from '@/theme';
import { advancedBatchStyles as baseSt } from '@/features/scan/components/advanced-batch/styles';

const ROW_HEIGHT   = 88;  // must match styles.row minHeight
const COMMIT_PX    = ROW_HEIGHT * 0.55; // how far to drag before committing

interface Props {
  index: number;
  totalRows: number;
  uri: string;
  selected: boolean;
  pageLabel: string;
  subLabel: string;
  onToggleSelect: () => void;
  onLongPressEditor: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export default function DraggableBatchPageRow({
  index,
  totalRows,
  uri,
  selected,
  pageLabel,
  subLabel,
  onToggleSelect,
  onLongPressEditor,
  onMoveUp,
  onMoveDown,
  onRemove,
}: Props) {
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const committed  = useSharedValue(false); // prevent double-commit per gesture

  const commitMove = useCallback((delta: number) => {
    if (delta < 0 && index > 0)              onMoveUp();
    if (delta > 0 && index < totalRows - 1)  onMoveDown();
  }, [index, totalRows, onMoveUp, onMoveDown]);

  const panGesture = Gesture.Pan()
    .minDistance(6)
    .activateAfterLongPress(180) // long-press to initiate drag
    .onStart(() => {
      isDragging.value = true;
      committed.value  = false;
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      // Commit once threshold crossed, then lock
      if (!committed.value) {
        if (e.translationY < -COMMIT_PX && index > 0) {
          committed.value = true;
          runOnJS(commitMove)(-1);
        } else if (e.translationY > COMMIT_PX && index < totalRows - 1) {
          committed.value = true;
          runOnJS(commitMove)(1);
        }
      }
    })
    .onEnd(() => {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      isDragging.value = false;
    })
    .onFinalize(() => {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      isDragging.value = false;
    });

  const animStyle = useAnimatedStyle(() => ({
    transform:    [{ translateY: translateY.value }],
    zIndex:       isDragging.value ? 20 : 1,
    shadowOpacity: isDragging.value ? 0.25 : 0,
    shadowRadius:  isDragging.value ? 12   : 0,
    elevation:     isDragging.value ? 12   : 0,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value ? 1.0 : 0.45,
  }));

  return (
    <Animated.View style={[animStyle, { shadowColor: '#000', shadowOffset: { width: 0, height: 4 } }]}>
      <TouchableOpacity
        style={[baseSt.row, selected && baseSt.rowSelected]}
        onPress={onToggleSelect}
        onLongPress={onLongPressEditor}
        activeOpacity={0.85}
      >
        {/* Drag handle — GestureDetector wraps only this area */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[st.dragHandle, handleStyle]}>
            <Icon name="reorder-two" size={20} color="#fff" />
          </Animated.View>
        </GestureDetector>

        <Image source={{ uri }} style={baseSt.thumb} />

        <View style={{ flex: 1 }}>
          <Text style={baseSt.rowTitle}>{pageLabel}</Text>
          <Text style={baseSt.rowSub}>{subLabel}</Text>
        </View>

        {/* Up / Down arrows (accessibility fallback) */}
        <View style={baseSt.rowBtns}>
          <TouchableOpacity
            style={[baseSt.iconBtn, index === 0 && baseSt.disabled]}
            disabled={index === 0}
            onPress={onMoveUp}
            hitSlop={{ top: 14, bottom: 6, left: 10, right: 10 }}
          >
            <Icon name="arrow-up" size={13} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[baseSt.iconBtn, index === totalRows - 1 && baseSt.disabled]}
            disabled={index === totalRows - 1}
            onPress={onMoveDown}
            hitSlop={{ top: 6, bottom: 14, left: 10, right: 10 }}
          >
            <Icon name="arrow-down" size={13} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={baseSt.iconBtn} onPress={onRemove} hitSlop={HIT_SLOP_LG}>
            <Icon name="trash" size={13} color={DANGER} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  dragHandle: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    alignSelf: 'stretch',
  },
});
