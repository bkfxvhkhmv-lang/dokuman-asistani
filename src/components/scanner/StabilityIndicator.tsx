import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Reanimated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Props {
  isStable: boolean;
  confidence: number;
}

const AnimatedView = Reanimated.createAnimatedComponent(View);

export const StabilityIndicator: React.FC<Props> = ({ isStable, confidence }) => {
  const barStyle = useAnimatedStyle(() => ({
    width: withSpring(`${confidence * 100}%`, { stiffness: 200 }),
    backgroundColor: isStable ? '#22C55E' : '#EAB308',
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {isStable ? '✓ Sabit - Çekim hazır' : 'Telefonu sabit tutun...'}
      </Text>
      <View style={styles.barContainer}>
        <AnimatedView style={[styles.bar, barStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  barContainer: {
    width: 120,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
});
