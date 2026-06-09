import React from 'react';
import { StyleSheet } from 'react-native';
import { View } from 'react-native';
import { SKIA_OK, SkCanvas, SkRect, SkLinearGrad, skVec } from './skiaDeps';

export function NeonGlowLayer({
  containerW,
  containerH,
  neonColors,
}: {
  containerW: number;
  containerH: number;
  neonColors: string[];
}) {
  if (!SKIA_OK || containerW === 0 || neonColors.length === 0) return null;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: 0.15 }]}
    >
      <SkCanvas style={StyleSheet.absoluteFill}>
        {neonColors.map((color, i) => {
          const yStart = (i / neonColors.length) * containerH;
          const yEnd = ((i + 1) / neonColors.length) * containerH;
          return (
            <SkRect key={i} x={0} y={yStart} width={containerW} height={yEnd - yStart}>
              <SkLinearGrad
                start={skVec(0, yStart)}
                end={skVec(containerW, yEnd)}
                colors={['transparent', `${color}12`, 'transparent']}
              />
            </SkRect>
          );
        })}
      </SkCanvas>
    </View>
  );
}
