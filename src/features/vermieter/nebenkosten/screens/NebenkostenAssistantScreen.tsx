import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { useStore } from '@/store';
import { generateLetterDraft } from '@/features/vermieter/nebenkosten/domain';
import { shareNkLetterPdf } from '@/features/vermieter/nebenkosten/export';
import {
  buildCostPositionFromImport,
  dokumentToImportSource,
  mapDokumentToCostPositionDraft,
} from '@/features/vermieter/nebenkosten/import';
import {
  useNebenkostenDraft,
  selectHasMinimumDraftData,
  buildAbrechnungFromDraft,
  runNebenkostenCalculation,
} from '@/features/vermieter/nebenkosten/store';
import { buildNkGuidance, type NkRole } from '@/features/vermieter/nebenkosten/guidance';
import { GuidanceItemCard } from './components/GuidanceItemCard';
import {
  NkImportConfirmCard,
  type NkImportConfirmFormValues,
} from './components/NkImportConfirmCard';
import Icon from '@/components/Icon';

function isNkRole(value: unknown): value is NkRole {
  return value === 'mieter' || value === 'vermieter';
}

export default function NebenkostenAssistantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string; sourceDokId?: string }>();
  const role = isNkRole(params.role) ? params.role : 'mieter';
  const { Colors: C, S, R } = useTheme();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useNebenkostenDraft();
  const [exporting, setExporting] = useState(false);
  const [importDismissed, setImportDismissed] = useState(false);

  const sourceDokId = (params.sourceDokId ?? '').trim();

  const { state: appState } = useStore();

  const importCandidate = useMemo(() => {
    if (!sourceDokId) return null;
    const dok = appState.dokumente.find((d) => d.id === sourceDokId);
    if (!dok) return null;
    const importSource = dokumentToImportSource(dok);
    return mapDokumentToCostPositionDraft(importSource);
  }, [sourceDokId, appState.dokumente]);

  const hasDraft = selectHasMinimumDraftData(state);

  const guidance = useMemo(
    () => buildNkGuidance(role, state.validationIssues, state.results),
    [role, state.validationIssues, state.results],
  );

  const roleLabel = role === 'vermieter' ? 'Vermieter' : 'Mieter';

  const handleNewDraft = () => {
    Alert.alert('Hinweis', 'Abrechnungserstellung folgt in Kürze.');
  };

  const handleSharePdf = async () => {
    if (exporting || !hasDraft) return;

    setExporting(true);
    try {
      const calcResult = runNebenkostenCalculation(state);
      if (!calcResult.ok || calcResult.results.length === 0 || state.landlord === null) {
        Alert.alert('Hinweis', 'PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
        return;
      }

      const abrechnung = buildAbrechnungFromDraft(state);
      const letter = generateLetterDraft(calcResult.results[0], abrechnung, state.landlord);
      const shareResult = await shareNkLetterPdf(letter);

      if (!shareResult.ok) {
        Alert.alert('Hinweis', 'PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
      }
    } catch {
      Alert.alert('Hinweis', 'PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
    } finally {
      setExporting(false);
    }
  };

  const pdfButtonDisabled = !hasDraft || exporting;

  const handleConfirmImport = (values: NkImportConfirmFormValues) => {
    if (!importCandidate) return;

    try {
      const costPosition = buildCostPositionFromImport({
        candidate: importCandidate,
        categoryKey: values.categoryKey,
        scope: values.scope,
        unitId: values.unitId,
        allocationKey: { type: values.allocationKeyType },
        totalCents: values.totalCents,
        includeInCalculation: values.includeInCalculation,
      });
      dispatch({ type: 'ADD_COST_POSITION', payload: costPosition });
      setImportDismissed(true);
    } catch {
      Alert.alert(
        'Hinweis',
        'Kostenposition konnte nicht hinzugefügt werden. Bitte prüfen Sie die Angaben.',
      );
    }
  };

  const handleCancelImport = () => {
    setImportDismissed(true);
  };

  return (
    <View style={[st.container, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <View style={[st.header, { borderBottomColor: C.borderLight, paddingHorizontal: S.lg }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-left" size={22} color={C.textSecondary} />
        </Pressable>
        <Text style={[st.headerTitle, { color: C.text }]}>Nebenkosten</Text>
        <View style={st.spacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          st.scroll,
          { paddingHorizontal: S.lg, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[st.badge, { backgroundColor: C.primaryLight, borderRadius: R.full }]}>
          <Text style={[st.badgeText, { color: C.primary }]}>{roleLabel}</Text>
        </View>

        {importCandidate && !importDismissed ? (
          <NkImportConfirmCard
            candidate={importCandidate}
            units={state.units}
            onConfirm={handleConfirmImport}
            onCancel={handleCancelImport}
          />
        ) : sourceDokId && !importDismissed ? (
          <View style={st.notFound}>
            <Text style={[st.notFoundText, { color: C.textSecondary }]}>
              Dokument nicht gefunden.
            </Text>
          </View>
        ) : null}

        {!hasDraft ? (
          <View style={st.empty}>
            <Text style={[st.emptyTitle, { color: C.text }]}>Noch keine Abrechnung</Text>
            <Text style={[st.emptyBody, { color: C.textSecondary }]}>
              Tippen Sie auf „Neu“, um eine Abrechnung zu beginnen und passende Hinweise zu erhalten.
            </Text>
          </View>
        ) : (
          <View style={st.list}>
            {guidance.items.length === 0 ? (
              <Text style={[st.noIssues, { color: C.textSecondary }]}>
                Aktuell keine Hinweise. Die Abrechnung scheint vollständig.
              </Text>
            ) : (
              guidance.items.map((item) => <GuidanceItemCard key={item.code + (item.refId ?? '')} item={item} />)
            )}
          </View>
        )}

        {role === 'vermieter' ? (
          <Pressable
            onPress={handleSharePdf}
            disabled={pdfButtonDisabled}
            style={({ pressed }) => [
              st.pdfButton,
              {
                borderColor: C.primary,
                borderRadius: R.md,
                opacity: pdfButtonDisabled ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={exporting ? 'PDF wird erstellt' : 'Als PDF teilen'}
            accessibilityState={{ disabled: pdfButtonDisabled }}
          >
            <Text style={[st.pdfButtonText, { color: C.primary }]}>
              {exporting ? 'PDF wird erstellt…' : 'Als PDF teilen'}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleNewDraft}
          style={({ pressed }) => [
            st.newButton,
            {
              backgroundColor: C.primary,
              borderRadius: R.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Neue Abrechnung"
        >
          <Text style={[st.newButtonText, { color: C.textInverse }]}>+ Neu</Text>
        </Pressable>

        <Text style={[st.disclaimer, { color: C.textTertiary }]}>
          Rechen- und Strukturhilfe. Keine Rechtsberatung.
        </Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  spacer: {
    width: 22,
  },
  scroll: {
    paddingTop: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    marginBottom: 16,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  noIssues: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  pdfButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
  },
  pdfButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  newButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  newButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
  },
  notFound: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 14,
  },
});
