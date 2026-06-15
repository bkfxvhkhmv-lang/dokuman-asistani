import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
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
  selectIsSetupComplete,
  buildAbrechnungFromDraft,
  runNebenkostenCalculation,
} from '@/features/vermieter/nebenkosten/store';
import { buildNkGuidance, type NkRole } from '@/features/vermieter/nebenkosten/guidance';
import { GuidanceItemCard } from './components/GuidanceItemCard';
import { getNkPdfExportBlockerMessage } from './utils/getNkPdfExportBlockerMessage';
import {
  NkImportConfirmCard,
  type NkImportConfirmFormValues,
} from './components/NkImportConfirmCard';
import {
  NkMinimalSetupCard,
  type NkMinimalSetupSavePayload,
} from './components/NkMinimalSetupCard';
import Icon from '@/components/Icon';
import { HIT_SLOP_LG, NAV_HIT_TARGET } from '@/theme';

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
  const isSetupComplete = selectIsSetupComplete(state);

  const guidance = useMemo(
    () => buildNkGuidance(role, state.validationIssues, state.results),
    [role, state.validationIssues, state.results],
  );

  const roleLabel = role === 'vermieter' ? 'Vermieter' : 'Mieter';

  const handleNewDraft = () => {
    if (role === 'mieter') {
      Alert.alert(
        'Hinweis',
        'Scannen Sie Ihre Nebenkostenabrechnung, um Hinweise zur Prüfung zu erhalten.',
      );
      return;
    }
    if (role === 'vermieter' && !isSetupComplete) {
      Alert.alert('Hinweis', 'Bitte zuerst die Grunddaten oben anlegen.');
      return;
    }
    if (role === 'vermieter' && isSetupComplete && !hasDraft) {
      Alert.alert(
        'Hinweis',
        'Noch keine Kostenpositionen vorhanden. Übernehmen Sie passende Belege als Kostenpositionen.',
      );
      return;
    }
    Alert.alert(
      'Hinweis',
      'Neue Positionen können aktuell über passende Dokumente als Kostenpositionen übernommen werden.',
    );
  };

  const handleSaveSetup = (payload: NkMinimalSetupSavePayload) => {
    if (selectIsSetupComplete(state)) return;

    dispatch({ type: 'SET_LANDLORD', payload: payload.landlord });
    dispatch({ type: 'SET_PROPERTY', payload: payload.property });
    dispatch({ type: 'SET_BILLING_PERIOD', payload: payload.billingPeriod });
    dispatch({ type: 'ADD_UNIT', payload: payload.unit });
    dispatch({ type: 'ADD_TENANCY', payload: payload.tenancy });
  };

  const handleSharePdf = async () => {
    if (exporting || !hasDraft) return;

    setExporting(true);
    try {
      const calcResult = runNebenkostenCalculation(state);
      const blockerMessage = getNkPdfExportBlockerMessage(calcResult, state);
      if (blockerMessage) {
        Alert.alert('Hinweis', blockerMessage);
        return;
      }
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
    } catch (error) {
      console.error('[NK] PDF export/share failed', error);
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
        consumptionTenantValue: values.consumptionTenantValue,
        consumptionTotalValue: values.consumptionTotalValue,
      });
      dispatch({ type: 'ADD_COST_POSITION', payload: costPosition });
      setImportDismissed(true);
    } catch (error) {
      console.error('[NK] cost position import failed', error);
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
          hitSlop={HIT_SLOP_LG}
          style={st.headerAction}
        >
          <Icon name="arrow-left" size={22} color={C.textSecondary} />
        </Pressable>
        <Text style={[st.headerTitle, { color: C.text }]}>Nebenkosten</Text>
        <View style={st.headerSpacer} />
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

        {role === 'vermieter' && !isSetupComplete ? (
          <NkMinimalSetupCard onSave={handleSaveSetup} />
        ) : null}

        {role === 'vermieter' && importCandidate && !importDismissed ? (
          <NkImportConfirmCard
            candidate={importCandidate}
            units={state.units}
            onConfirm={handleConfirmImport}
            onCancel={handleCancelImport}
          />
        ) : role === 'vermieter' && sourceDokId && !importDismissed && !importCandidate ? (
          <View style={st.notFound}>
            <Text style={[st.notFoundText, { color: C.textSecondary }]}>
              Dokument nicht gefunden.
            </Text>
          </View>
        ) : null}

        {!hasDraft ? (
          <View style={st.empty}>
            <Text style={[st.emptyTitle, { color: C.text }]}>
              {role === 'mieter'
                ? 'Nebenkostenabrechnung prüfen'
                : isSetupComplete
                  ? 'Noch keine Kostenpositionen'
                  : 'Noch keine Abrechnung'}
            </Text>
            <Text style={[st.emptyBody, { color: C.textSecondary }]}>
              {role === 'mieter'
                ? sourceDokId
                  ? 'Dieses Dokument wurde als Nebenkostenabrechnung erkannt. Öffnen Sie die Dokumentenansicht, um Analyse und Hinweise zu prüfen.'
                  : 'Scannen Sie Ihre Nebenkostenabrechnung, um Hinweise zur Prüfung zu erhalten.'
                : isSetupComplete
                  ? 'Übernehmen Sie passende Belege als Kostenpositionen, um Hinweise zu erhalten.'
                  : 'Legen Sie zuerst die Grunddaten oben an. Kostenpositionen können danach aus Dokumenten übernommen werden.'}
            </Text>
            {role === 'mieter' && !sourceDokId ? (
              <Pressable
                onPress={() => router.push('/(tabs)/Kamera')}
                style={({ pressed }) => [
                  st.scanButton,
                  { backgroundColor: C.primary, borderRadius: R.md, opacity: pressed ? 0.85 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Dokument scannen"
              >
                <Text style={[st.scanButtonText, { color: C.textInverse }]}>
                  Dokument scannen
                </Text>
              </Pressable>
            ) : null}
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
            {exporting ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Text style={[st.pdfButtonText, { color: C.primary }]}>Als PDF teilen</Text>
            )}
          </Pressable>
        ) : null}

        {role === 'vermieter' ? (
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
        ) : null}

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
  headerAction: {
    minWidth: NAV_HIT_TARGET,
    minHeight: NAV_HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: NAV_HIT_TARGET,
    minHeight: NAV_HIT_TARGET,
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
  scanButton: {
    marginTop: 20,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
