/**
 * D-3.5c-b — Minimal confirm UI for document import (no dispatch here)
 */

import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { AllocationKeyType, Unit } from '@/features/vermieter/nebenkosten/domain';
import {
  COST_CATEGORIES,
  resolveIncludeInCalculation,
} from '@/features/vermieter/nebenkosten/domain/costCategories';
import {
  parseConsumptionInput,
  parseEuroInputToCents,
  needsHeatingConsumptionInputs,
} from '@/features/vermieter/nebenkosten/import/buildCostPositionFromImport';
import type { NkCostPositionImportCandidate } from '@/features/vermieter/nebenkosten/import/types';

const ALLOCATION_OPTIONS: AllocationKeyType[] = [
  'wohnflaeche',
  'personen',
  'wohneinheit',
  'verbrauch',
  'direkt',
  'manuell',
];

export interface NkImportConfirmFormValues {
  categoryKey: string;
  scope: 'property' | 'unit';
  unitId?: string;
  allocationKeyType: AllocationKeyType;
  totalCents: number;
  includeInCalculation: boolean;
  consumptionTenantValue?: number;
  consumptionTotalValue?: number;
}

export interface NkImportConfirmCardProps {
  candidate: NkCostPositionImportCandidate;
  units: Unit[];
  onConfirm: (values: NkImportConfirmFormValues) => void;
  onCancel: () => void;
}

function initialAmountText(totalCents: number | null): string {
  if (totalCents == null) return '';
  return (totalCents / 100).toFixed(2).replace('.', ',');
}

export function NkImportConfirmCard({
  candidate,
  units,
  onConfirm,
  onCancel,
}: NkImportConfirmCardProps) {
  const { Colors: C, R } = useTheme();
  const categoryKeys = useMemo(() => Object.keys(COST_CATEGORIES), []);

  const [categoryKey, setCategoryKey] = useState(
    candidate.suggestedCategoryKey && COST_CATEGORIES[candidate.suggestedCategoryKey]
      ? candidate.suggestedCategoryKey
      : categoryKeys[0],
  );
  const [scope, setScope] = useState<'property' | 'unit'>('property');
  const [unitId, setUnitId] = useState<string | undefined>(units[0]?.id);
  const [allocationKeyType, setAllocationKeyType] = useState<AllocationKeyType>(
    COST_CATEGORIES[categoryKey]?.defaultAllocationKey ?? 'wohnflaeche',
  );
  const [amountText, setAmountText] = useState(initialAmountText(candidate.totalCents));
  const [tenantConsumptionText, setTenantConsumptionText] = useState('');
  const [totalConsumptionText, setTotalConsumptionText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedCategory = COST_CATEGORIES[categoryKey];
  const includeInCalculation = selectedCategory
    ? resolveIncludeInCalculation(selectedCategory.status)
    : true;
  const hasUnits = units.length > 0;
  const showConsumptionFields = needsHeatingConsumptionInputs(categoryKey, allocationKeyType);

  const handleScopeSelect = (option: 'property' | 'unit') => {
    if (option === 'unit' && !hasUnits) return;
    setScope(option);
  };

  const handleCategorySelect = (key: string) => {
    setCategoryKey(key);
    const category = COST_CATEGORIES[key];
    if (category) {
      setAllocationKeyType(category.defaultAllocationKey);
    }
  };

  const handleConfirmPress = () => {
    const totalCents = parseEuroInputToCents(amountText);
    if (totalCents === null) {
      setValidationError('Bitte einen gültigen Betrag eingeben.');
      return;
    }
    if (scope === 'unit' && !unitId) {
      setValidationError('Bitte eine Einheit auswählen.');
      return;
    }

    let consumptionTenantValue: number | undefined;
    let consumptionTotalValue: number | undefined;

    if (showConsumptionFields) {
      const tenantValue = parseConsumptionInput(tenantConsumptionText);
      const totalValue = parseConsumptionInput(totalConsumptionText);
      if (tenantValue === null || totalValue === null) {
        setValidationError('Bitte gültige Verbrauchswerte eingeben.');
        return;
      }
      if (totalValue <= 0) {
        setValidationError('Gesamtverbrauch muss größer als 0 sein.');
        return;
      }
      if (tenantValue > totalValue) {
        setValidationError('Mieter-Verbrauch darf Gesamtverbrauch nicht überschreiten.');
        return;
      }
      consumptionTenantValue = tenantValue;
      consumptionTotalValue = totalValue;
    }

    setValidationError(null);
    onConfirm({
      categoryKey,
      scope,
      unitId: scope === 'unit' ? unitId : undefined,
      allocationKeyType,
      totalCents,
      includeInCalculation,
      consumptionTenantValue,
      consumptionTotalValue,
    });
  };

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
      <Text style={[st.title, { color: C.text }]}>Kostenposition aus Dokument</Text>
      <Text style={[st.description, { color: C.textSecondary }]}>{candidate.descriptionDe}</Text>
      <Text style={[st.hint, { color: C.textTertiary }]}>
        Rechen- und Strukturhilfe. Bitte Angaben prüfen.
      </Text>

      <Text style={[st.label, { color: C.textTertiary }]}>Betrag (€)</Text>
      <TextInput
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        placeholder="0,00"
        placeholderTextColor={C.textTertiary}
        style={[st.input, { color: C.text, borderColor: C.borderLight, backgroundColor: C.bgInput }]}
      />

      <Text style={[st.label, { color: C.textTertiary }]}>Kategorie</Text>
      {candidate.suggestedCategoryKey === categoryKey && (
        <Text style={[st.vorschlag, { color: C.primary }]}>Vorschlag</Text>
      )}
      <View style={st.chipRow}>
        {categoryKeys.map((key) => (
          <Pressable
            key={key}
            onPress={() => handleCategorySelect(key)}
            style={[
              st.chip,
              {
                backgroundColor: categoryKey === key ? C.primaryLight : C.bgInput,
                borderColor: categoryKey === key ? C.primary : C.borderLight,
              },
            ]}
          >
            <Text style={[st.chipText, { color: categoryKey === key ? C.primary : C.text }]}>
              {COST_CATEGORIES[key].labelDe}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[st.label, { color: C.textTertiary }]}>Umfang</Text>
      <View style={st.chipRow}>
        {(['property', 'unit'] as const).map((option) => {
          const isUnitOption = option === 'unit';
          const isDisabled = isUnitOption && !hasUnits;
          return (
            <Pressable
              key={option}
              onPress={() => handleScopeSelect(option)}
              disabled={isDisabled}
              style={[
                st.chip,
                {
                  backgroundColor: scope === option ? C.primaryLight : C.bgInput,
                  borderColor: scope === option ? C.primary : C.borderLight,
                  opacity: isDisabled ? 0.45 : 1,
                },
              ]}
            >
              <Text style={[st.chipText, { color: scope === option ? C.primary : C.text }]}>
                {option === 'property' ? 'Objekt' : 'Einheit'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!hasUnits ? (
        <Text style={[st.unitHint, { color: C.textTertiary }]}>
          Einheit kann später ergänzt werden. Für den Anfang kann die Position dem Objekt zugeordnet werden.
        </Text>
      ) : null}

      {scope === 'unit' && hasUnits ? (
        <>
          <Text style={[st.label, { color: C.textTertiary }]}>Einheit</Text>
          <View style={st.chipRow}>
            {units.map((unit) => (
              <Pressable
                key={unit.id}
                onPress={() => setUnitId(unit.id)}
                style={[
                  st.chip,
                  {
                    backgroundColor: unitId === unit.id ? C.primaryLight : C.bgInput,
                    borderColor: unitId === unit.id ? C.primary : C.borderLight,
                  },
                ]}
              >
                <Text style={[st.chipText, { color: unitId === unit.id ? C.primary : C.text }]}>
                  {unit.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Text style={[st.label, { color: C.textTertiary }]}>Umlageschlüssel</Text>
      <View style={st.chipRow}>
        {ALLOCATION_OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setAllocationKeyType(option)}
            style={[
              st.chip,
              {
                backgroundColor: allocationKeyType === option ? C.primaryLight : C.bgInput,
                borderColor: allocationKeyType === option ? C.primary : C.borderLight,
              },
            ]}
          >
            <Text style={[st.chipText, { color: allocationKeyType === option ? C.primary : C.text }]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      {showConsumptionFields ? (
        <>
          <Text style={[st.consumptionHint, { color: C.textSecondary }]}>
            Für Heiz-/Warmwasserkosten werden Verbrauchswerte benötigt.
          </Text>
          <Text style={[st.label, { color: C.textTertiary }]}>Verbrauch Mieter/Einheit</Text>
          <TextInput
            value={tenantConsumptionText}
            onChangeText={setTenantConsumptionText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={C.textTertiary}
            style={[st.input, { color: C.text, borderColor: C.borderLight, backgroundColor: C.bgInput }]}
          />
          <Text style={[st.label, { color: C.textTertiary }]}>Gesamtverbrauch</Text>
          <TextInput
            value={totalConsumptionText}
            onChangeText={setTotalConsumptionText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={C.textTertiary}
            style={[st.input, { color: C.text, borderColor: C.borderLight, backgroundColor: C.bgInput }]}
          />
        </>
      ) : null}

      {validationError ? (
        <Text style={[st.error, { color: C.danger }]}>{validationError}</Text>
      ) : null}

      <Pressable
        onPress={handleConfirmPress}
        style={({ pressed }) => [
          st.primaryBtn,
          { backgroundColor: C.primary, borderRadius: R.md, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[st.primaryBtnText, { color: C.textInverse }]}>Kostenposition hinzufügen</Text>
      </Pressable>

      <Pressable onPress={onCancel} style={st.cancelBtn}>
        <Text style={[st.cancelBtnText, { color: C.textSecondary }]}>Abbrechen</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  vorschlag: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unitHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  consumptionHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 4,
  },
  error: {
    fontSize: 13,
    marginTop: 8,
  },
  primaryBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
