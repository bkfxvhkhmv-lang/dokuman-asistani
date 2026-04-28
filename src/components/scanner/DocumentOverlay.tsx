import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Circle } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');
const DEFAULT_FRAME_W = Math.round(SCREEN_W * 0.95);
const DEFAULT_FRAME_H = Math.round(DEFAULT_FRAME_W * 1.414); // A4
import { DocumentCorners } from '../../modules/scanner';

type Props = {
  corners?: DocumentCorners | null;
  mode?: 'document' | 'qr';
  hint?: string;
  topOffset?: `${number}%`;
  frameWidth?: number;
  frameHeight?: number;
  color?: string;
  cornerColor?: string;
  cornerOpacity?: number;
  showGlow?: boolean;
  glowColor?: string;
};

export const DocumentOverlay: React.FC<Props> = ({
  corners,
  mode = 'document',
  hint,
  topOffset = mode === 'qr' ? '30%' : '10%',
  frameWidth = mode === 'qr' ? 220 : DEFAULT_FRAME_W,
  frameHeight = mode === 'qr' ? 220 : DEFAULT_FRAME_H,
  color,
  cornerColor,
  cornerOpacity = 1,
  showGlow = false,
  glowColor = 'rgba(34,197,94,0.12)',
}) => {
  const resolvedColor = cornerColor || color || (mode === 'qr' ? '#7C6EF8' : 'rgba(255,255,255,0.85)');

  if (corners) {
    const { topLeft, topRight, bottomRight, bottomLeft, confidence } = corners;
    const edgeColor = confidence > 0.7 ? '#22C55E' : confidence > 0.4 ? '#EAB308' : '#EF4444';

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill}>
          <Polygon
            points={`
              ${topLeft.x},${topLeft.y}
              ${topRight.x},${topRight.y}
              ${bottomRight.x},${bottomRight.y}
              ${bottomLeft.x},${bottomLeft.y}
            `}
            fill={`${edgeColor}15`}
            stroke={edgeColor}
            strokeWidth="2.5"
          />
          {[topLeft, topRight, bottomRight, bottomLeft].map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={10}
              fill={edgeColor}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}
        </Svg>
      </View>
    );
  }

  return (
    <>
      {showGlow && (
        <View style={[st.glow, {
          top: topOffset,
          left: '15%',
          right: '15%',
          width: '70%',
          height: frameHeight,
          backgroundColor: glowColor,
          borderWidth: 1.5,
          borderColor: glowColor,
          borderRadius: 2,
        }]} pointerEvents="none" />
      )}
      <View style={[st.frame, { top: topOffset, width: frameWidth, height: frameHeight }]}>
        {[st.cornerTL, st.cornerTR, st.cornerBL, st.cornerBR].map((style, index) => (
          <View
            key={index}
            style={[
              st.corner,
              style,
              {
                borderColor: resolvedColor,
                width: mode === 'qr' ? 28 : 34,
                height: mode === 'qr' ? 28 : 34,
                opacity: cornerOpacity,
              },
            ]}
          />
        ))}
      </View>

      {!!hint && (
        <View style={[st.hintWrap, { top: topOffset, marginTop: frameHeight + 10 }]}>
          <Text style={st.hintText}>{hint}</Text>
        </View>
      )}
    </>
  );
};

export default DocumentOverlay;

const st = StyleSheet.create({
  frame: {
    position: 'absolute',
    alignSelf: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 2,
  },
  corner: {
    position: 'absolute',
    borderRadius: 2,
    borderWidth: 0,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    textAlign: 'center',
  },
});
