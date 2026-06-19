import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { Dokument } from '@/store';
import {
  dokumentToImportSource,
  mapDokumentToCostPositionDraft,
} from '@/features/vermieter/nebenkosten/import';
import { formatBetrag } from '@/utils/formatters';

interface Props {
  dok: Dokument;
  onPress: () => void;
}

type NkStatus = 'pruefen' | 'handeln';

function monthsSince(isoDate: string): number {
  const then = new Date(isoDate);
  const now = new Date();
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
}

function deriveStatus(dok: Dokument): NkStatus {
  if (dok.dokumentDatum && monthsSince(dok.dokumentDatum) >= 10) return 'handeln';
  const draft = mapDokumentToCostPositionDraft(dokumentToImportSource(dok));
  if (draft.suggestedCategoryKey !== null && draft.totalCents !== null && draft.totalCents > 0) {
    return 'handeln';
  }
  return 'pruefen';
}

export function NkSummaryCard({ dok, onPress }: Props) {
  const { Colors: C, R } = useTheme();

  const status = useMemo(() => deriveStatus(dok), [dok]);

  const betragLine = dok.betrag != null
    ? formatBetrag(dok.betrag, dok.waehrung ?? null)
    : null;

  const deadlineHint = dok.dokumentDatum
    ? `Frist prüfen`
    : null;

  const badgeColor = status === 'handeln' ? C.danger : C.warning;
  const badgeLabel = status === 'handeln' ? 'Handeln' : 'Prüfen';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[st.card, { borderColor: C.border, backgroundColor: C.bgCard, borderRadius: R.md ?? R.lg }]}
    >
      <View style={st.row}>
        <Icon name="file-document-edit-outline" size={20} color={C.primary} />
        <Text style={[st.title, { color: C.text }]}>Nebenkosten prüfen</Text>
        <View style={[st.badge, { backgroundColor: `${badgeColor}20`, borderColor: `${badgeColor}60` }]}>
          <Text style={[st.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>
      </View>

      {(betragLine || deadlineHint) ? (
        <View style={st.infoRow}>
          {betragLine ? (
            <Text style={[st.info, { color: C.textSecondary }]}>{betragLine}</Text>
          ) : null}
          {deadlineHint ? (
            <Text style={[st.info, { color: C.textTertiary }]}>{deadlineHint}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={st.ctaRow}>
        <Text style={[st.cta, { color: C.primary }]}>Nebenkostenassistent öffnen</Text>
        <Icon name="chevron-right" size={16} color={C.primary} />
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card: {
    marginTop: 16,
    marginHorizontal: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 28,
  },
  info: {
    fontSize: 12,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 28,
  },
  cta: {
    fontSize: 12,
    fontWeight: '500',
  },
});
