import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../ThemeContext';
import type { Dokument } from '../store';

type TabId = 'kurz' | 'punkte' | 'einfach' | 'technisch' | 'hukuki';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'kurz',      label: '1 Satz',    emoji: '⚡' },
  { id: 'punkte',    label: '3 Punkte',  emoji: '📋' },
  { id: 'einfach',   label: 'Einfach',   emoji: '🗣' },
  { id: 'technisch', label: 'Technisch', emoji: '🔧' },
  { id: 'hukuki',    label: 'Rechtlich', emoji: '⚖️' },
];

function buildKurz(dok: Dokument | undefined): string | null {
  if (!dok) return null;
  const betrag = dok.betrag ? ` (${dok.betrag.toFixed(2)} €)` : '';
  const frist  = dok.frist  ? ` bis ${new Date(dok.frist).toLocaleDateString('de-DE')}` : '';
  return `${dok.absender || 'Eine Behörde'} hat ${dok.titel || 'ein Dokument'} gesendet${betrag}${frist}.`;
}

function buildPunkte(dok: Dokument | undefined): string[] | null {
  if (!dok?.zusammenfassung) return null;
  const sätze = dok.zusammenfassung.split(/\.\s+/).filter(s => s.length > 10).slice(0, 3);
  return sätze.map((s, i) => `${i + 1}. ${s.trim().replace(/\.$/, '')}.`);
}

function buildEinfach(dok: Dokument | undefined): string | null {
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
  if (dok.betrag) teile.push(` Sie sollen ${dok.betrag.toFixed(2)} € bezahlen.`);
  if (dok.frist)  teile.push(` Das muss bis ${new Date(dok.frist).toLocaleDateString('de-DE')} erledigt sein.`);
  if (dok.risiko === 'hoch')    teile.push(' Das ist dringend — bitte sofort handeln!');
  if (dok.risiko === 'mittel')  teile.push('🔶 Diese Woche sollten Sie sich darum kümmern.');
  if (dok.risiko === 'niedrig') teile.push(' Kein sofortiger Handlungsbedarf.');
  if (dok.aktionen?.includes('einspruch')) teile.push('✍️ Sie können Einspruch einlegen, wenn Sie nicht einverstanden sind.');
  return teile.join('\n\n');
}

function buildTechnisch(dok: Dokument | undefined): string | null {
  if (!dok) return null;
  const felder = [
    `Typ: ${dok.typ || '—'}`,
    `Sender: ${dok.absender || '—'}`,
    `Risiko: ${dok.risiko || '—'}`,
    dok.betrag        ? `Betrag: ${dok.betrag.toFixed(2)} € (${dok.waehrung || 'EUR'})` : null,
    dok.frist         ? `Frist: ${dok.frist.slice(0, 10)} (ISO)` : null,
    dok.iban ? `IBAN: ${dok.iban}` : null,
    dok.aktenzeichen ? `Az.: ${dok.aktenzeichen}` : null,
    `OCR-Textlänge: ${(dok.rohText || '').length} Zeichen`,
    dok.etiketten?.length ? `Labels: ${dok.etiketten.join(', ')}` : null,
    dok.v4DocId       ? `V4 ID: ${dok.v4DocId}` : null,
  ].filter(Boolean);
  return felder.join('\n');
}

function buildHukuki(dok: Dokument | undefined): string | null {
  if (!dok) return null;
  const parts: string[] = [];
  if (dok.typ === 'Mahnung') {
    parts.push(' Rechtliche Einordnung: Zahlungserinnerung / Mahnung');
    parts.push('Bei Nichtbeachten droht ein Mahnverfahren (§ 688 ZPO) oder Inkasso.');
    parts.push('Einspruchsfrist: In der Regel 14 Tage nach Zustellung.');
  } else if (dok.typ === 'Bußgeld') {
    parts.push(' Rechtliche Einordnung: Bußgeldbescheid (OWiG)');
    parts.push('Einspruchsfrist: 2 Wochen nach Zustellung (§ 67 OWiG).');
    parts.push('Kein Einspruch = Bestandskraft → Vollstreckung möglich.');
  } else if (dok.typ === 'Behörde') {
    parts.push(' Rechtliche Einordnung: Verwaltungsakt (§ 35 VwVfG)');
    parts.push('Widerspruchsfrist: In der Regel 1 Monat (§ 70 VwGO).');
    parts.push('Bei Rechtswidrigkeit: Widerspruch → ggf. Verwaltungsklage.');
  } else {
    parts.push(' Keine spezifische Rechtsgrundlage ermittelt.');
    parts.push('Bei Unsicherheiten: Beratungsstelle oder Anwalt konsultieren.');
  }
  if (dok.aktionen?.includes('einspruch')) parts.push('✍️ Einspruchsrecht vorhanden — Frist beachten!');
  return parts.join('\n\n');
}

function autoSelectTab(dok: Dokument | undefined): TabId {
  if (!dok) return 'einfach';
  if (dok.risiko === 'hoch' && dok.aktionen?.includes('einspruch')) return 'hukuki';
  if (dok.rohText && dok.rohText.length > 2000 && dok.v4DocId) return 'technisch';
  if (dok.risiko === 'niedrig') return 'punkte';
  return 'einfach';
}

interface MultiLayerSummaryViewProps {
  dok?: Dokument;
}

export default function MultiLayerSummaryView({ dok }: MultiLayerSummaryViewProps) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>(() => autoSelectTab(dok));

  const content = useMemo(() => {
    switch (activeTab) {
      case 'kurz':      return { type: 'text', data: buildKurz(dok) };
      case 'punkte':    return { type: 'list', data: buildPunkte(dok) };
      case 'einfach':   return { type: 'text', data: buildEinfach(dok) };
      case 'technisch': return { type: 'mono', data: buildTechnisch(dok) };
      case 'hukuki':    return { type: 'text', data: buildHukuki(dok) };
      default:          return { type: 'text', data: null };
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
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
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
