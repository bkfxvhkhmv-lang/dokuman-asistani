/**
 * D-3.7b — Minimal inline setup for Vermieter draft structure (no dispatch here)
 */

import React, { useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type {
  Address,
  BillingPeriod,
  Landlord,
  Property,
  Tenancy,
  Unit,
} from '@/features/vermieter/nebenkosten/domain';
import { parseEuroInputToCents } from '@/features/vermieter/nebenkosten/import/buildCostPositionFromImport';
import { generateId } from '@/utils/formatters';

export interface NkMinimalSetupSavePayload {
  landlord: Landlord;
  property: Property;
  billingPeriod: BillingPeriod;
  unit: Unit;
  tenancy: Tenancy;
}

export interface NkMinimalSetupCardProps {
  onSave: (payload: NkMinimalSetupSavePayload) => void;
}

function splitStreetAndNumber(part: string): { street: string; houseNumber: string } {
  const match = /^(.+?)\s+(\d+\w*)$/.exec(part.trim());
  if (match) {
    return { street: match[1].trim(), houseNumber: match[2] };
  }
  return { street: part.trim(), houseNumber: '' };
}

export function parseAddressLine(input: string): Address {
  const trimmed = input.trim();
  if (!trimmed) {
    return { street: '', houseNumber: '', postalCode: '', city: '' };
  }

  const withComma = /^(.+?)\s*,\s*(\d{5})\s+(.+)$/.exec(trimmed);
  if (withComma) {
    const { street, houseNumber } = splitStreetAndNumber(withComma[1]);
    return {
      street,
      houseNumber,
      postalCode: withComma[2],
      city: withComma[3].trim(),
    };
  }

  const withPlz = /^(.+?)\s+(\d{5})\s+(.+)$/.exec(trimmed);
  if (withPlz) {
    const { street, houseNumber } = splitStreetAndNumber(withPlz[1]);
    return {
      street,
      houseNumber,
      postalCode: withPlz[2],
      city: withPlz[3].trim(),
    };
  }

  const { street, houseNumber } = splitStreetAndNumber(trimmed);
  return { street, houseNumber, postalCode: '', city: '' };
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

function normalizeDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isValidIsoDate(trimmed)) return trimmed;

  const deMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
  if (!deMatch) return null;

  const isoValue = `${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`;
  return isValidIsoDate(isoValue) ? isoValue : null;
}

/** Accepts German decimal input, e.g. "75,5" → 75.5 */
export function parseGermanDecimalInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function FieldLabel({ children }: { children: string }) {
  const { Colors: C } = useTheme();
  return <Text style={[st.label, { color: C.textTertiary }]}>{children}</Text>;
}

function FieldInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
}) {
  const { Colors: C } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textTertiary}
      keyboardType={keyboardType ?? 'default'}
      style={[st.input, { color: C.text, borderColor: C.borderLight, backgroundColor: C.bgInput }]}
    />
  );
}

export function NkMinimalSetupCard({ onSave }: NkMinimalSetupCardProps) {
  const { Colors: C, R } = useTheme();

  const [landlordName, setLandlordName] = useState('');
  const [landlordAddressLine, setLandlordAddressLine] = useState('');
  const [propertyAddressLine, setPropertyAddressLine] = useState('');
  const [areaSqmText, setAreaSqmText] = useState('');
  const [billingStart, setBillingStart] = useState('');
  const [billingEnd, setBillingEnd] = useState('');
  const [unitLabel, setUnitLabel] = useState('Wohnung 1');
  const [tenantName, setTenantName] = useState('');
  const [prepaymentText, setPrepaymentText] = useState('0');
  const [personsText, setPersonsText] = useState('1');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSavePress = () => {
    const name = landlordName.trim();
    const objectAddress = propertyAddressLine.trim();
    const areaSqm = parseGermanDecimalInput(areaSqmText);
    const start = normalizeDateInput(billingStart);
    const end = normalizeDateInput(billingEnd);
    const label = unitLabel.trim();
    const tenant = tenantName.trim();
    const prepaymentCents = parseEuroInputToCents(prepaymentText);
    const persons = Number.parseInt(personsText.trim(), 10);

    if (!name) {
      setValidationError('Bitte den Namen des Vermieters eingeben.');
      return;
    }
    if (!objectAddress) {
      setValidationError('Bitte die Objektadresse eingeben.');
      return;
    }
    if (areaSqm === null || areaSqm <= 0) {
      setValidationError('Bitte eine gültige Wohnfläche in m² eingeben.');
      return;
    }
    if (!start) {
      setValidationError('Bitte ein gültiges Startdatum im Format TT.MM.JJJJ eingeben.');
      return;
    }
    if (!end) {
      setValidationError('Bitte ein gültiges Enddatum im Format TT.MM.JJJJ eingeben.');
      return;
    }
    if (Date.parse(end) < Date.parse(start)) {
      setValidationError('Das Enddatum darf nicht vor dem Startdatum liegen.');
      return;
    }
    if (!label) {
      setValidationError('Bitte eine Bezeichnung für die Einheit eingeben.');
      return;
    }
    if (!tenant) {
      setValidationError('Bitte den Namen des Mieters eingeben.');
      return;
    }
    if (prepaymentCents === null) {
      setValidationError('Bitte eine gültige monatliche Vorauszahlung eingeben.');
      return;
    }
    if (!Number.isFinite(persons) || persons < 1) {
      setValidationError('Bitte mindestens eine Person angeben.');
      return;
    }

    setValidationError(null);

    const propertyId = generateId();
    const unitId = generateId();
    const landlordAddress = parseAddressLine(landlordAddressLine);
    const propertyAddress = parseAddressLine(propertyAddressLine);

    onSave({
      landlord: {
        id: generateId(),
        name,
        address: landlordAddress,
      },
      property: {
        id: propertyId,
        address: propertyAddress,
        totalAreaSqm: areaSqm,
        numberOfUnits: 1,
      },
      billingPeriod: {
        startDate: start,
        endDate: end,
      },
      unit: {
        id: unitId,
        propertyId,
        label,
        areaSqm: areaSqm,
      },
      tenancy: {
        id: generateId(),
        unitId,
        tenant: {
          id: generateId(),
          name: tenant,
        },
        startDate: start,
        numberOfPersons: persons,
        monthlyPrepaymentCents: prepaymentCents,
      },
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
      <Text style={[st.title, { color: C.text }]}>Grunddaten anlegen</Text>
      <Text style={[st.description, { color: C.textSecondary }]}>
        Diese Angaben bilden die Basis für die spätere Abrechnung. Kostenpositionen können danach aus
        Dokumenten übernommen werden.
      </Text>
      <Text style={[st.hint, { color: C.textTertiary }]}>
        Noch keine Kostenpositionen vorhanden. Übernehmen Sie danach passende Belege als
        Kostenpositionen.
      </Text>

      <FieldLabel>Vermieter (Name)</FieldLabel>
      <FieldInput value={landlordName} onChangeText={setLandlordName} placeholder="Max Mustermann" />

      <FieldLabel>Vermieter (Adresse)</FieldLabel>
      <FieldInput
        value={landlordAddressLine}
        onChangeText={setLandlordAddressLine}
        placeholder="Musterstraße 1, 12345 Berlin"
      />

      <FieldLabel>Objekt (Adresse)</FieldLabel>
      <FieldInput
        value={propertyAddressLine}
        onChangeText={setPropertyAddressLine}
        placeholder="Musterstraße 1, 12345 Berlin"
      />

      <FieldLabel>Wohnfläche (m²)</FieldLabel>
      <FieldInput
        value={areaSqmText}
        onChangeText={setAreaSqmText}
        placeholder="75"
        keyboardType="decimal-pad"
      />

      <FieldLabel>Abrechnungszeitraum Start</FieldLabel>
      <FieldInput
        value={billingStart}
        onChangeText={setBillingStart}
        placeholder="TT.MM.JJJJ"
      />

      <FieldLabel>Abrechnungszeitraum Ende</FieldLabel>
      <FieldInput value={billingEnd} onChangeText={setBillingEnd} placeholder="TT.MM.JJJJ" />

      <FieldLabel>Einheit</FieldLabel>
      <FieldInput value={unitLabel} onChangeText={setUnitLabel} placeholder="Wohnung 1" />

      <FieldLabel>Mieter (Name)</FieldLabel>
      <FieldInput value={tenantName} onChangeText={setTenantName} placeholder="Anna Beispiel" />

      <FieldLabel>Monatliche Vorauszahlung (€)</FieldLabel>
      <FieldInput
        value={prepaymentText}
        onChangeText={setPrepaymentText}
        placeholder="0,00"
        keyboardType="decimal-pad"
      />

      <FieldLabel>Personen</FieldLabel>
      <FieldInput
        value={personsText}
        onChangeText={setPersonsText}
        placeholder="1"
        keyboardType="number-pad"
      />

      {validationError ? (
        <Text style={[st.error, { color: C.danger }]}>{validationError}</Text>
      ) : null}

      <Pressable
        onPress={handleSavePress}
        style={({ pressed }) => [
          st.primaryBtn,
          { backgroundColor: C.primary, borderRadius: R.md, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[st.primaryBtnText, { color: C.textInverse }]}>Grunddaten speichern</Text>
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
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
});
