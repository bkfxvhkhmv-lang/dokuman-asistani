import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { normalizeDocumentTyp } from '@/product/canonicalDocTypes';
import { useT } from '@/hooks/useT';

type Props = {
  typ: string;
  userOrdner?: string | null;
  onAendern: () => void;
};

/** Schnelle Zuordnung: Auto-Kategorie + Nutzer-Ordner, ein Tap → Bearbeiten. */
export default function DocumentKlassifikationStrip({ typ, userOrdner, onAendern }: Props) {
  const { Colors: C, S, R } = useTheme();
  const { t: T } = useT();
  const kat = normalizeDocumentTyp(typ);
  const ordner = userOrdner?.trim() || '—';

  return (
    <View
      style={{
        marginHorizontal: S.md,
        marginBottom: S.md,
        paddingVertical: 12,
        paddingHorizontal: S.md,
        borderRadius: R.lg,
        borderWidth: 1,
        borderColor: C.borderLight,
        backgroundColor: C.bgCard,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: C.textTertiary, letterSpacing: 0.6 }}>
          {T('detail.section.assignment')}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginTop: 4 }} numberOfLines={1}>
          Kategorie: {kat}
        </Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }} numberOfLines={1}>
          Ordner: {ordner}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onAendern}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: R.lg, backgroundColor: C.primaryLight }}
      >
        <Text style={{ fontSize: 13, fontWeight: '800', color: C.primaryDark }}>{T('detail.change')}</Text>
      </TouchableOpacity>
    </View>
  );
}
