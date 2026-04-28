import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { CheckCircle, Archive, CurrencyEur, PencilSimple, CalendarBlank } from 'phosphor-react-native';
import { useTheme } from '../ThemeContext';
import DokumentKarte from './DokumentKarte';
import type { Dokument } from '../store';

interface SwipeableDokumentKarteProps {
  dok: Dokument;
  onErledigt?: (dok: Dokument) => void;
  onContextAction?: (dok: Dokument, action: 'bezahlt' | 'einspruch' | 'verschieben' | 'archivieren') => void;
  onPress?: (dok: Dokument) => void;
  onLongPress?: (dok: Dokument) => void;
  secilen?: boolean;
}

export default function SwipeableDokumentKarte({ dok, onErledigt, onContextAction, ...rest }: SwipeableDokumentKarteProps) {
  const swipeRef = useRef<any>(null);
  const { Colors } = useTheme();

  const ctx = (() => {
    const typ = dok.typ;
    if (typ === 'Rechnung' || (dok.betrag && dok.betrag > 0))
      return { key: 'bezahlt'    as const, label: 'Bezahlt',     Icon: CurrencyEur,   color: Colors.success,      bg: Colors.successLight };
    if (typ === 'Mahnung' || typ === 'Bußgeld')
      return { key: 'einspruch'  as const, label: 'Einspruch',   Icon: PencilSimple,  color: Colors.primaryDark,  bg: Colors.primaryLight };
    if (typ === 'Termin')
      return { key: 'verschieben' as const, label: 'Verschieben', Icon: CalendarBlank, color: Colors.primary,      bg: Colors.primaryLight };
    return   { key: 'archivieren' as const, label: 'Archivieren', Icon: Archive,       color: Colors.textSecondary, bg: Colors.bgInput };
  })();

  const handleDone = () => {
    swipeRef.current?.close();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onErledigt?.(dok);
  };

  const handleContext = () => {
    swipeRef.current?.close();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContextAction?.(dok, ctx.key);
  };

  const renderLeftActions = (_progress: Animated.AnimatedInterpolation<number>, drag: Animated.AnimatedInterpolation<number>) => {
    const scale = drag.interpolate({ inputRange: [0, 80], outputRange: [0.7, 1], extrapolate: 'clamp' });
    const opacity = drag.interpolate({ inputRange: [0, 56], outputRange: [0, 1], extrapolate: 'clamp' });
    return (
      <View style={[st.actionLeft, { backgroundColor: Colors.successLight }]} onTouchEnd={handleDone}>
        <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center', gap: 4 }}>
          <CheckCircle size={26} color={Colors.success} weight="fill" />
          <Text style={[st.actionText, { color: Colors.success }]}>Erledigt</Text>
        </Animated.View>
      </View>
    );
  };

  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, drag: Animated.AnimatedInterpolation<number>) => {
    const scale = drag.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.7], extrapolate: 'clamp' });
    const opacity = drag.interpolate({ inputRange: [-56, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <View style={[st.actionRight, { backgroundColor: ctx.bg }]} onTouchEnd={handleContext}>
        <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center', gap: 4 }}>
          <ctx.Icon size={26} color={ctx.color} weight="fill" />
          <Text style={[st.actionText, { color: ctx.color }]}>{ctx.label}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View
      accessibilityActions={[
        { name: 'erledigt', label: 'Als erledigt markieren' },
        { name: ctx.key,    label: ctx.label },
      ]}
      onAccessibilityAction={(e: any) => {
        if (e.nativeEvent.actionName === 'erledigt') handleDone();
        else handleContext();
      }}
    >
      <Swipeable
        ref={swipeRef}
        friction={1.8}
        leftThreshold={60}
        rightThreshold={60}
        overshootLeft={false}
        overshootRight={false}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        containerStyle={{ marginHorizontal: 0 }}
      >
        <DokumentKarte dok={dok} {...rest} />
      </Swipeable>
    </View>
  );
}

const st = StyleSheet.create({
  actionLeft: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 86,
    marginLeft: 16,
    marginVertical: 6,
    borderRadius: 20,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  actionRight: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 86,
    marginRight: 16,
    marginVertical: 6,
    borderRadius: 20,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
