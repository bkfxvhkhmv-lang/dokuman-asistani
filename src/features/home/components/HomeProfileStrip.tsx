import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useT } from '@/hooks/useT';

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
  const { t } = useT();
  if (!profiles?.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.profileStrip}
      contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8, paddingVertical: 4 }}>
      <TouchableOpacity
        style={{ paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1,
          borderColor: !activeProfileId ? colors.text : colors.borderLight,
          backgroundColor: !activeProfileId ? colors.text : 'transparent' }}
        onPress={() => onSelect(null)}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: !activeProfileId ? colors.bg : colors.textSecondary }}>{t('common.all')}</Text>
      </TouchableOpacity>
      {profiles.map(profile => {
        const isActive = activeProfileId === profile.id;
        return (
          <TouchableOpacity key={profile.id}
            style={{ paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1,
              borderColor: isActive ? colors.text : colors.borderLight,
              backgroundColor: isActive ? colors.text : 'transparent' }}
            onPress={() => onSelect(profile.id)}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? colors.bg : colors.textSecondary }}>
              {profile.emoji} {profile.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({ profileStrip: { marginBottom: 6, marginTop: 2 } });
