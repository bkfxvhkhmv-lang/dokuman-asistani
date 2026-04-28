import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Profile {
  id: string;
  name: string;
  emoji?: string;
  farbe?: string;
  [key: string]: unknown;
}

interface HomeProfileStripProps {
  colors: any;
  profiles?: Profile[];
  activeProfileId?: string | null;
  onSelect: (id: string | null) => void;
  spacing: any;
  radius: any;
}

export default function HomeProfileStrip({ colors, profiles, activeProfileId, onSelect, spacing, radius }: HomeProfileStripProps) {
  if (!profiles?.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.profileStrip}
      contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8, paddingVertical: 4 }}>
      <TouchableOpacity
        style={{ paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1.5,
          borderColor: !activeProfileId ? colors.primary : colors.border,
          backgroundColor: !activeProfileId ? colors.primaryLight : 'transparent' }}
        onPress={() => onSelect(null)}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: !activeProfileId ? colors.primaryDark : colors.textSecondary }}>Alle</Text>
      </TouchableOpacity>
      {profiles.map(profile => {
        const isActive = activeProfileId === profile.id;
        return (
          <TouchableOpacity key={profile.id}
            style={{ paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1.5,
              borderColor: isActive ? profile.farbe : colors.border,
              backgroundColor: isActive ? `${profile.farbe}22` : 'transparent' }}
            onPress={() => onSelect(profile.id)}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? profile.farbe : colors.textSecondary }}>
              {profile.emoji} {profile.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({ profileStrip: { marginBottom: 6, marginTop: 2 } });
