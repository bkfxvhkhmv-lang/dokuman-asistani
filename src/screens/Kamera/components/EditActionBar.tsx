import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import Icon from '../../../components/Icon';
import { styles } from '../styles';
import { ACCENT } from '../constants';
import { useTheme } from '../../../ThemeContext';

type ToolbarMode = 'default' | 'crop' | 'rotate';

interface ActionItem {
  key: 'crop' | 'optimize' | 'rotate';
  label: string;
  icon: string;
  activeColor: string;
  onPress: () => void;
}

interface Props {
  toolbarMode: ToolbarMode;
  isOptimizing: boolean;
  onStartCrop: () => void;
  onOptimize: () => void;
  onRotate: () => void;
}

function AnimatedActionBtn({
  item,
  isActive,
  isLoading,
}: {
  item: ActionItem;
  isActive: boolean;
  isLoading?: boolean;
}) {
  const { isSimpleMode, fs } = useTheme();
  const scale     = useRef(new Animated.Value(1)).current;
  const bgOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  const handlePress = useCallback(() => {
    if (isLoading) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, damping: 10, stiffness: 400 }),
      Animated.spring(scale, { toValue: 1,   useNativeDriver: true, damping: 12, stiffness: 300 }),
    ]).start();
    item.onPress();
  }, [item, isLoading, scale]);

  React.useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: isActive || isLoading ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isActive, isLoading, bgOpacity]);

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={isLoading}
        style={[
          styles.editActionBtn,
          { overflow: 'hidden' },
          (isActive || isLoading) && { borderColor: item.activeColor },
          isSimpleMode && { minHeight: 74 },
        ]}
      >
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 14,
            backgroundColor: `${item.activeColor}22`,
            opacity: bgOpacity,
          }}
        />
        {isLoading ? (
          <ActivityIndicator size="small" color={item.activeColor} />
        ) : (
          <Icon
            name={item.icon}
            size={isSimpleMode ? 26 : 20}
            color={isActive ? item.activeColor : 'rgba(255,255,255,0.92)'}
          />
        )}
        <Text
          style={[
            styles.editActionText,
            { fontSize: fs(11), color: (isActive || isLoading) ? item.activeColor : 'rgba(255,255,255,0.85)' },
          ]}
          maxFontSizeMultiplier={1.1}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function EditActionBar({
  toolbarMode,
  isOptimizing,
  onStartCrop,
  onOptimize,
  onRotate,
}: Props) {
  const actions: ActionItem[] = [
    { key: 'crop',     label: 'Zuschneiden', icon: 'crop',            activeColor: '#34D399', onPress: onStartCrop },
    { key: 'optimize', label: 'Optimieren',  icon: 'magic-wand',      activeColor: ACCENT,    onPress: onOptimize },
    { key: 'rotate',   label: 'Drehen',      icon: 'arrow-clockwise', activeColor: '#FBBF24', onPress: onRotate },
  ];

  return (
    <View style={styles.editActions}>
      {actions.map(action => (
        <AnimatedActionBtn
          key={action.key}
          item={action}
          isActive={toolbarMode === action.key}
          isLoading={action.key === 'optimize' && isOptimizing}
        />
      ))}
    </View>
  );
}
