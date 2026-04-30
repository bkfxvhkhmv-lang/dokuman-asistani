/**
 * Sayisal degerleri yumusakca animasyonla gecirir (#70).
 *
 * Native driver kapali — string format'ina cevirmek icin JS thread
 * gereken her frame'de listener uzerinden okuma yapiyoruz.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Easing, Text } from 'react-native';

interface Props {
  value: number;
  formatter?: (v: number) => string;
  style?: any;
}

export default function AnimatedCounter({
  value,
  formatter = (v: number) => String(Math.round(v)),
  style,
}: Props) {
  const [display, setDisplay] = useState(() => formatter(value));
  const animRef  = useRef(new RNAnimated.Value(value));
  const prevVal  = useRef(value);

  useEffect(() => {
    if (prevVal.current === value) return;
    prevVal.current = value;

    const anim = RNAnimated.timing(animRef.current, {
      toValue:         value,
      duration:        320,
      easing:          Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    const id = animRef.current.addListener(({ value: v }) =>
      setDisplay(formatter(Math.round(v))),
    );
    anim.start(() => animRef.current.removeListener(id));
    return () => {
      anim.stop();
      animRef.current.removeListener(id);
    };
  }, [value, formatter]);

  return <Text style={style}>{display}</Text>;
}
