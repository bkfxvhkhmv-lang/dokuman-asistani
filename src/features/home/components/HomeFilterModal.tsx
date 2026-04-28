import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppButton, AppChip } from '../../../design/components';
import type { ThemeColors } from '../../../ThemeContext';
import type { ShadowTokens, SpacingTokens, RadiusTokens } from '../../../theme';

const DEFAULT_FILTER = { risiko: 'alle', typ: 'alle', sortBy: 'risiko', nurOffen: true };
const RISK_OPTIONS   = [{ key: 'alle', label: 'Alle' }, { key: 'hoch', label: 'Hoch' }, { key: 'mittel', label: 'Mittel' }, { key: 'niedrig', label: 'Niedrig' }];
const TYPE_OPTIONS   = [{ key: 'alle', label: 'Alle' }, { key: 'Rechnung', label: 'Rechnung' }, { key: 'Mahnung', label: 'Mahnung' }, { key: 'Vertrag', label: 'Vertrag' }, { key: 'Versicherung', label: 'Versicherung' }, { key: 'Bußgeld', label: 'Bußgeld' }];

interface FilterState { risiko: string; typ: string; sortBy: string; nurOffen: boolean }
interface HomeFilterModalProps {
  visible: boolean;
  onClose: () => void;
  colors: ThemeColors;
  shadow?: ShadowTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  activeTab: string;
  filter: FilterState;
  setFilter: (fn: (prev: FilterState) => FilterState) => void;
}

function Section({ title, children, color, spacing }: { title: string; children: React.ReactNode; color: string; spacing: SpacingTokens }) {
  return <View style={[st.section, { marginTop: spacing?.md || 12 }]}><Text style={[st.sectionTitle, { color }]}>{title}</Text>{children}</View>;
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={st.chipRow}>{children}</View>;
}

export default function HomeFilterModal({ visible, onClose, colors: C, shadow, spacing: S, radius: R, activeTab, filter, setFilter }: HomeFilterModalProps) {
  if (!visible) return null;

  const updateFilter = (patch: Partial<FilterState>) => setFilter?.(prev => ({ ...prev, ...patch }));
  const toggleNurOffen = () => setFilter?.(prev => ({ ...prev, nurOffen: !prev?.nurOffen }));
  const resetFilter = () => setFilter?.(() => DEFAULT_FILTER);

  const showRisk     = activeTab === 'Aufgaben' || activeTab === 'Kalender';
  const showType     = activeTab === 'Dokumente' || activeTab === 'Zahlungen';
  const isPayments   = activeTab === 'Zahlungen';
  const isFolders    = activeTab === 'Ordner';

  const sortOptions = isPayments ? [{ key: 'frist', label: 'Fälligkeit' }, { key: 'betrag_hoch', label: 'Betrag' }, { key: 'datum_neu', label: 'Neueste' }]
    : isFolders ? [{ key: 'datum_neu', label: 'Neueste' }, { key: 'datum_alt', label: 'Älteste' }]
    : showRisk  ? [{ key: 'risiko', label: 'Risiko' }, { key: 'frist', label: 'Frist' }, { key: 'datum_neu', label: 'Neueste' }]
    : [{ key: 'datum_neu', label: 'Neueste' }, { key: 'datum_alt', label: 'Älteste' }, { key: 'betrag_hoch', label: 'Betrag' }];

  return (
    <View style={[st.sheet, shadow?.lg, { backgroundColor: C.bgCard, borderColor: C.border, borderRadius: R?.xl || 24, padding: S?.lg || 20 }]}>
      <Text style={[st.title, { color: C.text }]}>Filter & Sortierung</Text>
      <Text style={[st.subtitle, { color: C.textSecondary }]}>Für: {activeTab}</Text>

      {showRisk && (
        <Section title="Risiko" color={C.textSecondary} spacing={S}>
          <ChipRow>
            {RISK_OPTIONS.map((opt, i) => (
              <AppChip key={opt.key} label={opt.label} selected={(filter?.risiko || 'alle') === opt.key}
                onPress={() => updateFilter({ risiko: opt.key })}
                style={i > 0 ? { marginLeft: 8, marginTop: 8 } : { marginTop: 8 }} />
            ))}
          </ChipRow>
        </Section>
      )}

      {showType && (
        <Section title="Typ" color={C.textSecondary} spacing={S}>
          <ChipRow>
            {TYPE_OPTIONS.map((opt, i) => (
              <AppChip key={opt.key} label={opt.label} selected={(filter?.typ || 'alle') === opt.key}
                onPress={() => updateFilter({ typ: opt.key })}
                style={i > 0 ? { marginLeft: 8, marginTop: 8 } : { marginTop: 8 }} />
            ))}
          </ChipRow>
        </Section>
      )}

      {!isFolders && (
        <Section title="Nur offene" color={C.textSecondary} spacing={S}>
          <AppChip label={filter?.nurOffen ? 'Nur offene' : 'Alle anzeigen'} selected={filter?.nurOffen ?? true}
            onPress={toggleNurOffen} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
        </Section>
      )}

      <Section title="Sortierung" color={C.textSecondary} spacing={S}>
        <ChipRow>
          {sortOptions.map((option, index) => (
            <AppChip key={option.key} label={option.label} selected={(filter?.sortBy || 'risiko') === option.key}
              onPress={() => updateFilter({ sortBy: option.key })}
              style={index > 0 ? { marginLeft: 8, marginTop: 8 } : { marginTop: 8 }} />
          ))}
        </ChipRow>
      </Section>

      <View style={[st.hintBox, { backgroundColor: C.bg, borderColor: C.border, marginTop: S?.md || 12 }]}>
        <Text style={[st.hintText, { color: C.textSecondary }]}>
          {activeTab === 'Aufgaben'  && 'Hier steuerst du offene Aufgaben, Risiko und Reihenfolge.'}
          {activeTab === 'Dokumente' && 'Dokumente lassen sich nach Typ und Aktualität eingrenzen.'}
          {activeTab === 'Ordner'    && 'Ordner bleibt bewusst simpel: Fokus auf Reihenfolge und Übersicht.'}
          {activeTab === 'Kalender'  && 'Kalender profitiert vor allem von Risiko- und Fristsortierung.'}
          {activeTab === 'Zahlungen' && 'Zahlungen lassen sich sinnvoll nach Typ, Fälligkeit und Betrag ordnen.'}
        </Text>
      </View>

      <View style={[st.actions, { marginTop: S?.lg || 16 }]}>
        <AppButton label="Zurücksetzen" variant="secondary" onPress={resetFilter} style={{ flex: 1, marginRight: 8 }} />
        <AppButton label="Schließen" onPress={onClose} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  sheet:       { borderWidth: 1 },
  title:       { fontSize: 22, fontWeight: '800' },
  subtitle:    { marginTop: 6, fontSize: 14 },
  section:     { gap: 10 },
  sectionTitle:{ fontSize: 13, fontWeight: '700', letterSpacing: 0.1, textTransform: 'uppercase' },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: -8 },
  hintBox:     { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  hintText:    { fontSize: 12, lineHeight: 18 },
  actions:     { flexDirection: 'row', alignItems: 'center' },
});
