import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '../../../components/Icon';
import { AppCard } from '../../../design/components';
import { getTageVerbleibend } from '../../../utils';
import type { Dokument } from '../../../store';
import type { ThemeColors } from '../../../ThemeContext';
import type { SpacingTokens } from '../../../theme';


function fristTag(fristISO: string | null | undefined, C: ThemeColors) {
  const t = getTageVerbleibend(fristISO ?? null);
  if (t === null) return null;
  if (t < 0)   return { text: 'Überfällig!',    color: C.danger };
  if (t === 0) return { text: 'Heute fällig!',  color: C.danger };
  if (t === 1) return { text: 'Morgen fällig',  color: C.warning };
  if (t <= 3)  return { text: `Noch ${t} Tage`, color: C.warning };
  return { text: `${t} Tage`, color: null };
}

function workflowTone(dok: Dokument, colors: ThemeColors) {
  if (dok.workflowColor === 'green') return { bg: colors.successLight, text: colors.successText || colors.success };
  if (dok.workflowColor === 'amber') return { bg: colors.warningLight, text: colors.warningText || colors.warning };
  if (dok.workflowColor === 'blue')  return { bg: colors.primaryLight, text: colors.primaryDark };
  return null;
}

interface DashboardStats {
  wichtig?: number; mitDeadline?: number; mahnungen?: number;
  vertraege?: number; duplikate?: number; fehlend?: number;
}

interface HomeDashboardCardsProps {
  colors: ThemeColors;
  dashboardStats: DashboardStats;
  spacing: SpacingTokens;
  topDocs?: Dokument[];
  onDocPress?: (dok: Dokument) => void;
  onStatChipPress?: (filter: string) => void;
}

export default function HomeDashboardCards({
  colors: C, dashboardStats, spacing: S, topDocs = [], onDocPress, onStatChipPress,
}: HomeDashboardCardsProps) {
  const { wichtig = 0, mitDeadline = 0, mahnungen = 0, vertraege = 0, duplikate = 0, fehlend = 0 } = dashboardStats;
  const allClear = wichtig === 0 && mitDeadline === 0;

  const chips = [
    { label: 'Mahnungen', val: mahnungen, icon: 'alert-circle-outline', warn: mahnungen > 0, filter: 'Mahnung' },
    { label: 'Verträge',  val: vertraege, icon: 'document-text-outline', warn: false,          filter: 'Vertrag' },
    { label: 'Duplikate', val: duplikate, icon: 'copy-outline',           warn: duplikate > 0, filter: 'duplikate' },
    { label: 'Unvollst.', val: fehlend,   icon: 'reader-outline',         warn: fehlend > 0,   filter: 'fehlend' },
  ];

  return (
    <View style={{ paddingHorizontal: S.md, marginBottom: S.md }}>
      {/* Hero card */}
      <AppCard style={[st.heroCard, { backgroundColor: allClear ? C.success : C.primary }]} padding={S.lg} radius={18}>
        <Text style={st.eyebrow}>{allClear ? 'HEUTE' : 'HEUTE · HANDLUNGSBEDARF'}</Text>
        {allClear ? (
          <>
            <Text style={st.heroNumber}>✓</Text>
            <Text style={st.heroText}>Alles unter Kontrolle — keine offenen Aufgaben</Text>
          </>
        ) : (
          <>
            <Text style={st.heroNumber}>{wichtig}</Text>
            <Text style={st.heroText}>
              {wichtig === 1 ? 'Dokument erfordert' : 'Dokumente erfordern'} Ihre Aufmerksamkeit
              {mitDeadline > 0 ? ` · ${mitDeadline} mit offener Frist` : ''}
            </Text>
          </>
        )}
      </AppCard>

      {/* Snippet doc cards */}
      {topDocs.slice(0, 2).map(dok => {
        const frist    = dok.frist ? fristTag(dok.frist, C) : null;
        const workflow = workflowTone(dok, C);
        return (
          <TouchableOpacity key={dok.id} onPress={() => onDocPress?.(dok)}
            style={[st.snippet, { backgroundColor: C.bgCard, borderColor: C.border }]} activeOpacity={0.75}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.text, letterSpacing: -0.1 }} numberOfLines={1}>
                {dok.titel}
              </Text>
              <Text style={{ fontSize: 11, color: C.textSecondary, letterSpacing: 0.1 }} numberOfLines={1}>
                {dok.absender}
              </Text>
              {frist && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Icon name="time-outline" size={11} color={frist.color ?? C.textTertiary} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: frist.color ?? C.textTertiary }}>
                    {frist.text}
                  </Text>
                </View>
              )}
              {!!dok.workflowStamp && workflow && (
                <View style={[st.workflowBox, { backgroundColor: workflow.bg }]}>
                  <Text style={[st.workflowStamp, { color: workflow.text }]}>{dok.workflowStamp}</Text>
                  {!!dok.workflowTimeline && (
                    <Text style={[st.workflowTimeline, { color: workflow.text }]} numberOfLines={1}>
                      {dok.workflowTimeline}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <Icon name="chevron-right" size={16} color={C.textTertiary} />
          </TouchableOpacity>
        );
      })}

      {/* Stat chips */}
      <View style={st.chipsRow}>
        {chips.map(chip => {
          const active = chip.warn && chip.val > 0;
          return (
            <TouchableOpacity
              key={chip.label}
              onPress={() => onStatChipPress?.(chip.filter)}
              activeOpacity={onStatChipPress ? 0.75 : 1}
              style={[st.chip, {
                backgroundColor: active ? C.warningLight : C.bgCard,
                borderColor: active ? `${C.warning}88` : C.border,
              }]}
            >
              <Icon name={chip.icon} size={14} color={active ? C.warning : C.textSecondary} />
              <Text style={[st.chipVal,   { color: active ? C.warning : C.text }]}>{chip.val}</Text>
              <Text style={[st.chipLabel, { color: active ? C.warning : C.textTertiary }]}>{chip.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  heroCard:        { marginBottom: 10 },
  eyebrow:         { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  heroNumber:      { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  heroText:        { fontSize: 12, color: 'rgba(255,255,255,0.80)', marginTop: 4, lineHeight: 17 },
  snippet:         { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 8 },
  workflowBox:     { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, marginTop: 4 },
  workflowStamp:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  workflowTimeline:{ fontSize: 10, fontWeight: '500', marginTop: 1 },
  chipsRow:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  chip:            { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipVal:         { fontSize: 13, fontWeight: '700' },
  chipLabel:       { fontSize: 11, fontWeight: '500' },
});
