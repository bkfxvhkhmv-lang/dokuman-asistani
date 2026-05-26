import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { CheckCircle, CalendarBlank, Bell } from 'phosphor-react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import DokumentKarte from '@/components/DokumentKarte';
import type { Dokument } from '@/store';

interface SwipeableDokumentKarteProps {
  dok: Dokument;
  onErledigt?: (dok: Dokument) => void;
  onContextAction?: (dok: Dokument, action: 'aufgabe' | 'frist') => void;
  onPress?: (dok: Dokument) => void;
  onLongPress?: (dok: Dokument) => void;
  secilen?: boolean;
}

export default function SwipeableDokumentKarte({ dok, onErledigt, onContextAction, ...rest }: SwipeableDokumentKarteProps) {
  const swipeRef = useRef<any>(null);
  const { Colors } = useTheme();
  const { t: T } = useT();

  // Sol panel (sola sürükleme): Frist varsa "Frist", yoksa "Aufgabe"
  const leftAction = dok.frist
    ? { key: 'frist'   as const, label: 'Frist',   Icon: CalendarBlank, color: Colors.primary }
    : { key: 'aufgabe' as const, label: 'Aufgabe',  Icon: Bell,          color: Colors.primary };

  const handleDone = () => {
    swipeRef.current?.close();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onErledigt?.(dok);
  };

  const handleLeftAction = () => {
    swipeRef.current?.close();
    Haptics.selectionAsync();
    onContextAction?.(dok, leftAction.key);
  };

  // renderLeftActions → sağa sürükleme (→) → sol panel → Erledigt
  const renderLeftActions = (_progress: Animated.AnimatedInterpolation<number>, drag: Animated.AnimatedInterpolation<number>) => {
    const scale   = drag.interpolate({ inputRange: [0, 80], outputRange: [0.7, 1], extrapolate: 'clamp' });
    const opacity = drag.interpolate({ inputRange: [0, 56], outputRange: [0, 1],   extrapolate: 'clamp' });
    return (
      <View style={[st.actionLeft, { backgroundColor: `${Colors.success}18`, borderColor: `${Colors.success}33`, borderWidth: 1 }]} onTouchEnd={handleDone}>
        <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center', gap: 4 }}>
          <CheckCircle size={26} color={Colors.success} weight="fill" />
          <Text style={[st.actionText, { color: Colors.success }]}>{T('doc.swipe.done')}</Text>
        </Animated.View>
      </View>
    );
  };

  // renderRightActions → sola sürükleme (←) → sağ panel → Frist / Aufgabe
  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, drag: Animated.AnimatedInterpolation<number>) => {
    const scale   = drag.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.7], extrapolate: 'clamp' });
    const opacity = drag.interpolate({ inputRange: [-56, 0], outputRange: [1, 0],   extrapolate: 'clamp' });
    return (
      <View style={[st.actionRight, { backgroundColor: `${leftAction.color}18`, borderColor: `${leftAction.color}33`, borderWidth: 1 }]} onTouchEnd={handleLeftAction}>
        <Animated.View style={{ transform: [{ scale }], opacity, alignItems: 'center', gap: 4 }}>
          <leftAction.Icon size={26} color={leftAction.color} weight="fill" />
          <Text style={[st.actionText, { color: leftAction.color }]}>{leftAction.label}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View
      accessibilityActions={[
        { name: 'erledigt',        label: 'Als erledigt markieren' },
        { name: leftAction.key,    label: leftAction.key === 'frist' ? 'Frist eintragen' : 'Aufgabe hinzufügen' },
      ]}
      onAccessibilityAction={(e: any) => {
        if (e.nativeEvent.actionName === 'erledigt') handleDone();
        else handleLeftAction();
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
  actionText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
