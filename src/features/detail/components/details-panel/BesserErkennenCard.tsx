import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import type { Dokument } from '@/store/types';
import { useAiLabeler } from '@/hooks/useAiLabeler';
import { useT } from '@/hooks/useT';

interface Props {
  dok: Dokument;
}

/**
 * Manual AI Labeler entry point in the Angaben / Dokumentdaten area.
 *
 * Visible only when shouldLabel(dok) returns true (weak/generic classification).
 * Never auto-triggers — user must tap "Besser erkennen".
 * Shows suggestion before persisting; user confirms via "Übernehmen".
 */
export function BesserErkennenCard({ dok }: Props) {
  const { Colors: C, S, R } = useTheme();
  const { t } = useT();
  const {
    isEligible, loading, suggestion, error,
    triggerLabel, acceptSuggestion, ignoreSuggestion,
  } = useAiLabeler(dok);

  // Only render when the document has weak/generic classification
  if (!isEligible) return null;

  return (
    <View style={{
      marginBottom: S.md,
      borderRadius: R.lg,
      borderWidth: 0.5,
      borderColor: C.borderLight,
      backgroundColor: C.bgCard,
      overflow: 'hidden',
    }}>

      {/* ── Header row ────────────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: S.lg, paddingTop: 14, paddingBottom: suggestion || error || loading ? 10 : 14,
      }}>
        <Icon name="sparkle" size={16} color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>
            {t('detail.recognize_better.title')}
          </Text>
          {!suggestion && !error && !loading && (
            <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
              {t('besser.card.subtitle')}
            </Text>
          )}
        </View>
        {!suggestion && !loading && (
          <TouchableOpacity
            onPress={triggerLabel}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: 8, backgroundColor: C.primary,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>
              {t('besser.button')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: S.lg, paddingBottom: 14,
        }}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={{ fontSize: 12, color: C.textSecondary }}>
            {t('besser.loading')}
          </Text>
        </View>
      )}

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {!!error && !loading && (
        <View style={{
          marginHorizontal: S.lg, marginBottom: 14,
          padding: 10, borderRadius: 8,
          backgroundColor: `${C.danger}12`,
          borderWidth: 0.5, borderColor: `${C.danger}44`,
        }}>
          <Text style={{ fontSize: 12, color: C.danger }}>{error}</Text>
        </View>
      )}

      {/* ── Suggestion ────────────────────────────────────────────────── */}
      {!!suggestion && !loading && (
        <View style={{
          borderTopWidth: 0.5, borderTopColor: C.borderLight,
          paddingHorizontal: S.lg, paddingVertical: 14, gap: 10,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: C.textTertiary, letterSpacing: 0.4 }}>
            {t('besser.suggest.header')}
          </Text>

          {/* Suggested title */}
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>
            {suggestion.response.displayTitle}
          </Text>

          {/* Suggested sender */}
          {!!suggestion.response.sender && (
            <Text style={{ fontSize: 12, color: C.textSecondary }}>
              {suggestion.response.sender}
            </Text>
          )}

          {/* Short summary */}
          {!!suggestion.response.shortSummary && (
            <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 17 }}>
              {suggestion.response.shortSummary}
            </Text>
          )}

          {/* Review hint */}
          <Text style={{ fontSize: 10, color: C.textTertiary }}>
            {suggestion.response.needsUserConfirmation
              ? 'Einige Angaben sollten geprüft werden'
              : 'KI-geprüft'}
          </Text>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity
              onPress={acceptSuggestion}
              activeOpacity={0.75}
              style={{
                flex: 1, paddingVertical: 9, borderRadius: 8,
                backgroundColor: C.primary, alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
                {t('besser.accept')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={ignoreSuggestion}
              activeOpacity={0.75}
              style={{
                flex: 1, paddingVertical: 9, borderRadius: 8,
                backgroundColor: C.bgInput, alignItems: 'center',
                borderWidth: 0.5, borderColor: C.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.textSecondary }}>
                {t('besser.ignore')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
