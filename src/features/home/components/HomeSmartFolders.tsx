import React, { useRef } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../ThemeContext';
import type { SmartFolder } from '../../../services/SmartFolderService';

interface Props {
  folders:       SmartFolder[];
  onFolderPress: (folder: SmartFolder) => void;
}

export default function HomeSmartFolders({ folders, onFolderPress }: Props) {
  const { Colors, S } = useTheme();

  if (folders.length === 0) return null;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[st.sectionTitle, { color: Colors.textTertiary, paddingHorizontal: S.lg }]}>
        Schnellzugriff
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={98}        // card 88 + gap 10
        snapToAlignment="start"
        contentContainerStyle={[st.scroll, { paddingHorizontal: S.lg }]}
        style={{ marginTop: 9 }}
      >
        {folders.map((folder) => (
          <FolderCard key={folder.id} folder={folder} colors={Colors} onPress={onFolderPress} />
        ))}
      </ScrollView>
    </View>
  );
}

function FolderCard({
  folder,
  colors,
  onPress,
}: {
  folder:  SmartFolder;
  colors:  any;
  onPress: (f: SmartFolder) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 10 }).start();

  return (
    <Pressable
      onPress={() => onPress(folder)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[
        st.card,
        {
          backgroundColor: colors.bgCard,
          borderColor:      `${folder.color}28`,
          shadowColor:      folder.color,
          transform: [{ scale }],
        },
      ]}>
        {/* Icon background */}
        <View style={[st.iconBg, { backgroundColor: `${folder.color}1A` }]}>
          <Text style={st.emoji}>{folder.emoji}</Text>
        </View>

        {/* Badge */}
        <View style={[st.badge, { backgroundColor: folder.color }]}>
          <Text style={st.badgeText}>{folder.count > 99 ? '99+' : folder.count}</Text>
        </View>

        {/* Label */}
        <Text style={[st.label, { color: colors.text }]} numberOfLines={2}>{folder.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  scroll:       { gap: 10 },
  card:         {
    width:        88,
    borderRadius: 18,
    padding:      12,
    paddingTop:   14,
    alignItems:   'center',
    gap:          5,
    borderWidth:  1,
    shadowOpacity: 0.16,
    shadowRadius:  10,
    shadowOffset:  { width: 0, height: 3 },
    elevation:     3,
    position:     'relative',
  },
  iconBg:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emoji:      { fontSize: 22 },
  badge:      {
    position:     'absolute',
    top:          8,
    right:        8,
    minWidth:     18,
    height:       18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems:   'center',
    justifyContent: 'center',
  },
  badgeText:  { color: '#fff', fontSize: 9, fontWeight: '800' },
  label:      { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 14 },
});
