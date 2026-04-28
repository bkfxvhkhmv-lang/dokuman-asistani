import React from 'react';
import { Platform, View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppChip, AppIconButton } from '../../../design/components';

interface HomeHeaderClusterProps {
  colors: any;
  tabs: readonly string[];
  activeTab: string;
  onTabPress: (tab: string) => void;
  onSearchPress: () => void;
  onFilterPress: () => void;
  filterActive?: boolean;
  filterOpen?: boolean;
  unreadCount?: number;
}

export default function HomeHeaderCluster({
  colors, tabs, activeTab, onTabPress, onSearchPress, onFilterPress, filterActive, filterOpen = false, unreadCount = 0,
}: HomeHeaderClusterProps) {
  const insets = useSafeAreaInsets();
  const hasUnread = unreadCount > 0;

  return (
    <LinearGradient
      colors={Platform.OS === 'android'
        ? [colors.primaryLight, `${colors.primaryLight}CC`, colors.bg]
        : [colors.primaryLight, colors.bg]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[st.headerCluster, { borderBottomColor: `${colors.border}88`, paddingTop: Math.max(insets.top, 12) }]}
    >
      <View style={st.headerRow}>
        {/* Brand */}
        <View style={st.brandBlock}>
          <View style={[st.brandMark, { backgroundColor: colors.primary }]}>
            <View style={st.brandFrame} />
            <Text style={st.brandPlane}>➤</Text>
            <Text style={st.brandSpark}>✦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.appname, { color: colors.text }]}>BriefPilot</Text>
            <Text style={[st.gruss, { color: hasUnread ? colors.primary : colors.textSecondary }]}>
              {hasUnread
                ? `${unreadCount} neue${unreadCount > 1 ? '' : 's'} Dokument${unreadCount > 1 ? 'e' : ''}`
                : 'Alles im Griff'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={st.headerActions}>
          <AppIconButton name="options-outline" onPress={onFilterPress} active={filterOpen} badge={filterActive && !filterOpen} accessibilityLabel={filterOpen ? 'Filter schließen' : 'Filter öffnen'} />
          <AppIconButton name="search-outline"  onPress={onSearchPress} size={19} accessibilityLabel="Suche" />
        </View>
      </View>

      {/* Tab strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={st.tabsWrap}
        contentContainerStyle={st.tabs}
      >
        {tabs.map(tab => (
          <AppChip
            key={tab}
            label={tab}
            selected={activeTab === tab}
            onPress={() => onTabPress(tab)}
            selectedColor={colors.primaryLight}
            selectedTextColor={colors.primaryDark}
            style={st.tab}
          />
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  headerCluster: { paddingBottom: 10, borderBottomWidth: 0.5, zIndex: 20 },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18 },
  brandBlock:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: 12 },
  brandMark:     { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  brandFrame:    { position: 'absolute', width: 21, height: 21, borderRadius: 7, borderWidth: 2.5, borderColor: '#fff', transform: [{ rotate: '-22deg' }], left: 9, top: 11 },
  brandPlane:    { position: 'absolute', right: 3, top: 1, color: '#fff', fontSize: 20, fontWeight: '800', transform: [{ rotate: '-18deg' }] },
  brandSpark:    { position: 'absolute', left: 15, top: 16, color: '#FFB11A', fontSize: 10, fontWeight: '800' },
  appname:       { fontSize: 26, fontWeight: '800', letterSpacing: -0.8 },
  gruss:         { fontSize: 12, fontWeight: '500', marginTop: 3, letterSpacing: 0.1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  tabsWrap:      { marginTop: 12 },
  tabs:          { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 2 },
  tab:           { borderWidth: 0 },
});
