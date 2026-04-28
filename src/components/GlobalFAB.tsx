import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Pressable, PanResponder, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';

const { width: W, height: H } = Dimensions.get('window');
const FAB_SIZE = 58;
const INIT_X = W - FAB_SIZE - 20;
const INIT_Y = H - FAB_SIZE - 100;

interface FabAction {
  id: string;
  emoji: string;
  label: string;
  route: string | null;
}

const ACTIONS: FabAction[] = [
  { id: 'camera', emoji: '📷', label: 'Foto aufnehmen', route: '/(tabs)/Kamera' },
  { id: 'search', emoji: '🔍', label: 'Suche',          route: '/(tabs)/Suche' },
];

interface GlobalFABProps {
  router: { push: (route: string) => void };
}

export default function GlobalFAB({ router }: GlobalFABProps) {
  const { Colors: C, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY({ x: INIT_X, y: INIT_Y })).current;
  const lastPos = useRef({ x: INIT_X, y: INIT_Y });

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
    onPanResponderGrant: () => {
      pan.setOffset(lastPos.current);
      pan.setValue({ x: 0, y: 0 });
      if (open) {
        Animated.spring(anim, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
        setOpen(false);
      }
    },
    onPanResponderMove: (_, g) => { pan.setValue({ x: g.dx, y: g.dy }); },
    onPanResponderRelease: (_, g) => {
      pan.flattenOffset();
      const nx = Math.max(0, Math.min(lastPos.current.x + g.dx, W - FAB_SIZE));
      const ny = Math.max(0, Math.min(lastPos.current.y + g.dy, H - FAB_SIZE));
      lastPos.current = { x: nx, y: ny };
      Animated.spring(pan, { toValue: { x: nx, y: ny }, useNativeDriver: false, bounciness: 4 }).start();
    },
  })).current;

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const toValue = open ? 0 : 1;
    Animated.spring(anim, { toValue, useNativeDriver: true, bounciness: 8 }).start();
    setOpen(!open);
  };

  const handleAction = (action: FabAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle();
    if (action.route) router.push(action.route);
  };

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  const fabStyle = {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    backgroundColor: C.primary,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.60 : 0.45,
    shadowRadius: 10,
    elevation: 8,
  };

  const miniFabStyle = {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.bgCard,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    shadowColor: isDark ? 'transparent' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.18,
    shadowRadius: 5,
    elevation: isDark ? 0 : 5,
  };

  const miniLabelWrapStyle = {
    backgroundColor: isDark ? C.bgInput : '#1F1B3A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  };

  return (
    <>
      {open && (
        <Pressable style={StyleSheet.absoluteFill} onPress={toggle}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]} />
        </Pressable>
      )}
      <Animated.View style={[st.container, { left: pan.x, top: pan.y }]} pointerEvents="box-none" {...panResponder.panHandlers}>
        {ACTIONS.map((action, idx) => {
          const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -(68 + idx * 58)] });
          const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
          return (
            <Animated.View key={action.id} style={[st.miniWrap, { transform: [{ translateY }], opacity }]}>
              <TouchableOpacity
                onPress={() => handleAction(action)}
                style={miniLabelWrapStyle}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>{action.label}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAction(action)}
                style={miniFabStyle}
                accessibilityLabel={action.label}
                accessibilityRole="button"
                importantForAccessibility="no"
              >
                <Text style={{ fontSize: 20 }}>{action.emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        <TouchableOpacity
          onPress={toggle}
          style={fabStyle}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Menü schließen' : 'Aktionen öffnen'}
          accessibilityState={{ expanded: open }}
        >
          <Animated.Text style={{ fontSize: 26, color: '#fff', transform: [{ rotate }] }}>+</Animated.Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const st = StyleSheet.create({
  container: { position: 'absolute', alignItems: 'flex-end' },
  miniWrap: { position: 'absolute', right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
