import React from 'react';
import { ViewStyle } from 'react-native';
import { Colors } from '@/theme';
import {
  PHOSPHOR_DEFAULT_WEIGHT_MAP,
  PHOSPHOR_ICON_MAP,
  type IconWeight,
} from './Icon/phosphorMap';

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  weight?: IconWeight;
  style?: ViewStyle | ViewStyle[];
  shadow?: boolean;
};

export default function Icon({
  name,
  size = 20,
  color = Colors.text,
  weight,
  style = {},
  shadow = false,
}: IconProps) {
  const Component = PHOSPHOR_ICON_MAP[name];
  if (!Component) return null;

  const resolvedWeight = weight ?? PHOSPHOR_DEFAULT_WEIGHT_MAP[name] ?? 'regular';

  const iconStyle = shadow
    ? [{ shadowColor: color, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }, style]
    : style;

  return <Component size={size} color={color} weight={resolvedWeight} style={iconStyle} />;
}
