/**
 * D-3.5c-a — Preview card: shows import candidate info (read-only, no dispatch).
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { COST_CATEGORIES } from '@/features/vermieter/nebenkosten/domain/costCategories';
import type { NkCostPositionImportCandidate } from '@/features/vermieter/nebenkosten/import/types';

export interface NkImportPreviewCardProps {
  candidate: NkCostPositionImportCandidate;
}

function formatEuro(cents: number | null): string | null {
  if (cents === null || cents === undefined) return null;
  return `${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function NkImportPreviewCard({ candidate }: NkImportPreviewCardProps) {
  const { Colors: C, R } = useTheme();

  const categoryLabel = candidate.suggestedCategoryKey
    ? COST_CATEGORIES[candidate.suggestedCategoryKey]?.labelDe ?? candidate.suggestedCategoryKey
    : null;

  return (
    <View
      style={[
        st.card,
        {
          backgroundColor: C.bgCard,
          borderColor: C.borderLight,
          borderRadius: R.md,
          borderLeftWidth: 4,
          borderLeftColor: C.primaryMid,
        },
      ]}
    >
      <View style={[st.badge, { backgroundColor: C.primaryLight }]}>
        <Text style={[st.badgeText, { color: C.primary }]}>
          Dokument erkannt
        </Text>
      </View>

      <Text style={[st.description, { color: C.text }]}>
        {candidate.descriptionDe}
      </Text>

      {formatEuro(candidate.totalCents) && (
        <Text style={[st.amount, { color: C.textSecondary }]}>
          Betrag: {formatEuro(candidate.totalCents)}
        </Text>
      )}

      {candidate.sourceMeta.absender && (
        <Text style={[st.meta, { color: C.textTertiary }]}>
          Von: {candidate.sourceMeta.absender}
        </Text>
      )}

      {categoryLabel && (
        <View style={[st.suggestionBadge, { backgroundColor: C.bgInput }]}>
          <Text style={[st.suggestionLabel, { color: C.textTertiary }]}>
            Vorschlag
          </Text>
          <Text style={[st.suggestionValue, { color: C.text }]}>
            {categoryLabel}
          </Text>
        </View>
      )}

      <Text style={[st.hint, { color: C.textTertiary }]}>
        Rechen- und Strukturhilfe. Bitte Angaben prüfen, bevor Sie fortfahren.
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 6,
  },
  amount: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    marginBottom: 8,
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
    gap: 6,
  },
  suggestionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  suggestionValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
});
