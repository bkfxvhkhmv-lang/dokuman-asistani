/**
 * DocumentMagnifier (#57)
 *
 * A circular magnifier that appears when the user long-presses + drags
 * on a document image. Shows a 2× zoom of the area under the finger.
 *
 * Works with React Native's built-in Image (no expo-image needed).
 * The magnification effect is achieved by rendering a scaled Image
 * clipped inside a circular View, offset to center on the finger.
 *
 * Usage:
 *   <View ref={containerRef}>
 *     <Image source={{ uri }} ... />
 *     <DocumentMagnifier
 *       uri={dok.uri}
 *       containerWidth={w}
 *       containerHeight={h}
 *     />
 *   </View>
 */

import React, { useRef, useState } from 'react';
import {
  View, Image, StyleSheet, PanResponder, Text,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';

const MAG_SIZE    = 130;
const MAG_SCALE   = 2.2;
const MAG_RADIUS  = MAG_SIZE / 2;

interface DocumentMagnifierProps {
  uri:             string | null;
  containerWidth:  number;
  containerHeight: number;
}

export default function DocumentMagnifier({
  uri,
  containerWidth,
  containerHeight,
}: DocumentMagnifierProps) {
  const { Colors: C } = useTheme();
  const [fingerPos, setFingerPos] = useState({ x: 0, y: 0 });
  const [visible,   setVisible]   = useState(false);

  const scale   = useSharedValue(0);
  const opacity = useSharedValue(0);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder:  () => !!uri,
    onMoveShouldSetPanResponder:   () => !!uri,
    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      setFingerPos({ x: locationX, y: locationY });
      setVisible(true);
      scale.value   = withSpring(1, { damping: 14, stiffness: 260 });
      opacity.value = withTiming(1, { duration: 120 });
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      setFingerPos({ x: locationX, y: locationY });
    },
    onPanResponderRelease: () => {
      scale.value   = withSpring(0, { damping: 14, stiffness: 260 });
      opacity.value = withTiming(0, { duration: 150 }, () => { });
      setTimeout(() => setVisible(false), 200);
    },
    onPanResponderTerminate: () => {
      scale.value   = withSpring(0, { damping: 14, stiffness: 260 });
      opacity.value = withTiming(0, { duration: 150 });
      setTimeout(() => setVisible(false), 200);
    },
  })).current;

  const magStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  if (!uri || containerWidth === 0) return null;

  // Position magnifier above the finger
  const magX = Math.max(0, Math.min(fingerPos.x - MAG_RADIUS, containerWidth - MAG_SIZE));
  const magY = Math.max(0, fingerPos.y - MAG_SIZE - 20);

  // Compute image offset to center magnified view on finger position
  const imgOffX = -(fingerPos.x * MAG_SCALE - MAG_RADIUS);
  const imgOffY = -(fingerPos.y * MAG_SCALE - MAG_RADIUS);

  return (
    <View
      style={StyleSheet.absoluteFill}
      {...panResponder.panHandlers}
    >
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            st.magnifier,
            {
              left:         magX,
              top:          magY,
              borderColor:  C.primary,
              shadowColor:  C.primary,
            },
            magStyle,
          ]}
        >
          {/* Zoomed image */}
          <Image
            source={{ uri }}
            style={{
              width:  containerWidth  * MAG_SCALE,
              height: containerHeight * MAG_SCALE,
              left:   imgOffX,
              top:    imgOffY,
              position: 'absolute',
            }}
            resizeMode="contain"
          />
          {/* Crosshair */}
          <View pointerEvents="none" style={st.crossH} />
          <View pointerEvents="none" style={st.crossV} />
        </Animated.View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  magnifier: {
    position:     'absolute',
    width:         MAG_SIZE,
    height:        MAG_SIZE,
    borderRadius:  MAG_RADIUS,
    overflow:      'hidden',
    borderWidth:   2,
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius:  12,
    elevation:     12,
  },
  crossH: {
    position:        'absolute',
    top:             MAG_RADIUS - 0.5,
    left:            MAG_RADIUS - 20,
    width:           40,
    height:          1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  crossV: {
    position:        'absolute',
    left:            MAG_RADIUS - 0.5,
    top:             MAG_RADIUS - 20,
    width:           1,
    height:          40,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
