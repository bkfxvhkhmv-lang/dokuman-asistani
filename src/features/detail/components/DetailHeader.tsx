import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppIconButton } from '../../../design/components';
import { useTheme } from '../../../ThemeContext';
import { HIT_SLOP_LG } from '../../../theme';

interface DetailHeaderProps {
  onBack: () => void;
  anonModus?: boolean;
  moreMenuOpen?: boolean;
  onOpenMore: () => void;
}

export default function DetailHeader({ onBack, anonModus, moreMenuOpen = false, onOpenMore }: DetailHeaderProps) {
  const { Colors: C, S } = useTheme();

  return (
    <>
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 8,
        borderBottomWidth: 0.5, borderBottomColor: C.border,
      }}>
        <TouchableOpacity
          onPress={onBack}
          style={{ paddingVertical: 4, paddingRight: 12 }}
          hitSlop={HIT_SLOP_LG}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <Text style={{ fontSize: 15, fontWeight: '500', color: C.primary }}>← Zurück</Text>
        </TouchableOpacity>
        <AppIconButton
          name="ellipsis-horizontal"
          size={17}
          active={moreMenuOpen}
          onPress={onOpenMore}
          accessibilityLabel={moreMenuOpen ? 'Menü schließen' : 'Weitere Optionen'}
        />
      </View>

      {anonModus && (
        <View style={{
          marginHorizontal: S.md, marginTop: 6, borderRadius: 10, padding: 10,
          backgroundColor: C.warningLight, borderWidth: 0.5, borderColor: C.warning,
        }}>
          <Text style={{ fontSize: 11, color: C.warningText, fontWeight: '600' }}>
            🕵️ Anonymisierungsmodus aktiv — Namen, Beträge und IBAN werden beim Teilen maskiert
          </Text>
        </View>
      )}
    </>
  );
}
