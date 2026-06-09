import { View, Animated } from 'react-native';

interface Props {
  headerProgress: Animated.Value;
  borderLight: string;
  primary: string;
}

export function DetailScrollProgressBar({ headerProgress, borderLight, primary }: Props) {
  return (
    <View style={{ height: 2, backgroundColor: borderLight, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: 2,
          backgroundColor: primary,
          width: headerProgress.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
}
