import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Reanimated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Props {
  isStable: boolean;
  isCapturing: boolean;
  onPress: () => void;
  size?: number;
}

const AnimatedView = Reanimated.createAnimatedComponent(View);

export const CaptureButton: React.FC<Props> = ({
  isStable,
  isCapturing,
  onPress,
  size = 80,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: withSpring(
      isStable ? '#22C55E' : 'rgba(255,255,255,0.5)',
      { stiffness: 300, damping: 20 }
    ),
    shadowColor: withSpring(
      isStable ? '#22C55E' : 'transparent',
      { stiffness: 300, damping: 20 }
    ),
    shadowOpacity: withSpring(isStable ? 0.8 : 0),
    shadowRadius: withSpring(isStable ? 20 : 0),
    transform: [{ scale: withSpring(isCapturing ? 0.9 : 1) }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isCapturing}
    >
      <AnimatedView style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        animatedStyle,
      ]}>
        <View
          style={[
            styles.inner,
            {
              width: size * 0.75,
              height: size * 0.75,
              borderRadius: size * 0.375,
              backgroundColor: isCapturing ? '#EAB308' : isStable ? '#22C55E' : '#fff',
            },
          ]}
        />
      </AnimatedView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
