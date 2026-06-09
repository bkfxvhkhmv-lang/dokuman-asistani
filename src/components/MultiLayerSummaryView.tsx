import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { Dokument } from '@/store';
import { formatFrist } from '@/utils/formatters';

type TabId = 'kurz' | 'detailliert';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'kurz',        label: 'Kurz',        emoji: '📋' },
  { id: 'detailliert', label: 'Detailliert',  emoji: '🗣' },
];

function buildKurz(dok: Dokument | undefined): string[] | null {
  if (!dok?.zusammenfassung) return null;
  const sätze = dok.zusammenfassung.split(/\.\s+/).filter(s => s.length > 10).slice(0, 3);
  return sätze.map((s, i) => `${i + 1}. ${s.trim().replace(/\.$/, '')}.`);
}

function buildDetailliert(dok: Dokument | undefined): string | null {
  if (!dok) return null;
  const teile: string[] = [];
  const absender = dok.absender || 'Eine Behörde';
  const typMap: Record<string, string> = {
    Rechnung: 'eine Rechnung', Mahnung: 'eine Mahnung', Bußgeld: 'einen Bußgeldbescheid',
    Behörde: 'einen Bescheid', Termin: 'eine Terminbestätigung', Vertrag: 'einen Vertrag',
    Versicherung: 'ein Schreiben',
  };
  const typ = typMap[dok.typ] || 'ein Schreiben';
  teile.push(`📬 ${absender} hat ${typ} geschickt.`);
  if (dok.betrag && dok.betrag > 0) teile.push(` Sie sollen ${dok.betrag.toFixed(2)} € bezahlen.`);
  if (dok.frist) { const f = formatFrist(dok.frist); if (f) teile.push(` Das muss bis ${f} erledigt sein.`); }
  if (dok.risiko === 'hoch')    teile.push(' Das ist dringend — bitte sofort handeln!');
  if (dok.risiko === 'mittel')  teile.push('🔶 Diese Woche sollten Sie sich darum kümmern.');
  if (dok.risiko === 'niedrig') teile.push(' Kein sofortiger Handlungsbedarf.');
  if (dok.aktionen?.includes('einspruch')) teile.push('✍️ Sie können Einspruch einlegen, wenn Sie nicht einverstanden sind.');
  return teile.join('\n\n');
}

function autoSelectTab(_dok: Dokument | undefined): TabId {
  return 'kurz';
}

interface MultiLayerSummaryViewProps {
  dok?: Dokument;
}

export default function MultiLayerSummaryView({ dok }: MultiLayerSummaryViewProps) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>(() => autoSelectTab(dok));

  const content = useMemo(() => {
    switch (activeTab) {
      case 'kurz':        return { type: 'list', data: buildKurz(dok) };
      case 'detailliert': return { type: 'text', data: buildDetailliert(dok) };
      default:            return { type: 'text', data: null };
    }
  }, [activeTab, dok]);

  if (!dok) return null;

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md }}>
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 8 }}>
        MEHRSTUFIGE ZUSAMMENFASSUNG
      </Text>
      <View style={{ borderRadius: R.lg, backgroundColor: C.bgCard, borderWidth: 0.5, borderColor: C.border, overflow: 'hidden', ...Shadow.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 6, gap: 4 }}
          style={{ borderBottomWidth: 0.5, borderBottomColor: C.borderLight }}>
          {TABS.map(tab => {
            const active = tab.id === activeTab;
            return (
              <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
                  minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
                  backgroundColor: active ? C.primary : 'transparent' }}>
                <Text style={{ fontSize: 12 }}>{tab.emoji}</Text>
                <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? '#fff' : C.textSecondary }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={{ padding: S.md, minHeight: 80 }}>
          {content.data == null && (
            <Text style={{ fontSize: 12, color: C.textTertiary, fontStyle: 'italic' }}>
              Für diese Ansicht sind keine Daten vorhanden.
            </Text>
          )}
          {content.type === 'list' && Array.isArray(content.data) && (content.data as string[]).map((s, i) => (
            <Text key={i} style={{ fontSize: 13, color: C.text, lineHeight: 20, marginBottom: 6 }}>{s}</Text>
          ))}
          {content.type === 'mono' && content.data && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={{ fontSize: 11, color: C.text, fontFamily: 'monospace', lineHeight: 18 }}>
                {content.data as string}
              </Text>
            </ScrollView>
          )}
          {content.type === 'text' && content.data && (
            <Text style={{ fontSize: 13, color: C.text, lineHeight: 21 }}>{content.data as string}</Text>
          )}
        </View>
      </View>
    </View>
  );
}
