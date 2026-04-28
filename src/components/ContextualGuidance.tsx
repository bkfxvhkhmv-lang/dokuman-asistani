import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../ThemeContext';
import type { ColorPalette } from '../theme';
import type { Dokument } from '../store';

interface GuidanceCard {
  id: string;
  emoji: string;
  title: string;
  sub: string;
  color: string;
  bg: string;
  action: (() => void) | null;
  actionLabel: string | null;
  priority: number;
}

function buildCards(docs: Dokument[], router: { push: (route: any) => void }, C: ColorPalette): GuidanceCard[] {
  const cards: GuidanceCard[] = [];
  const heute = new Date(); heute.setHours(0, 0, 0, 0);

  const kritisch = docs.filter(d => d.risiko === 'hoch' && !d.erledigt);
  if (kritisch.length > 0) {
    cards.push({ id: 'kritisch', emoji: '🔴',
      title: `${kritisch.length} dringende${kritisch.length === 1 ? 's Dokument' : ' Dokumente'}`,
      sub: kritisch.slice(0, 2).map(d => d.absender || d.titel).join(', '),
      color: C.danger, bg: C.dangerLight, action: () => {}, actionLabel: 'Jetzt ansehen →', priority: 10 });
  }

  const heuteUndMorgen = docs.filter(d => {
    if (!d.frist || d.erledigt) return false;
    const days = Math.ceil((new Date(d.frist).getTime() - heute.getTime()) / 86400000);
    return days >= 0 && days <= 1;
  });
  if (heuteUndMorgen.length > 0) {
    cards.push({ id: 'heutemorgen', emoji: '⏰',
      title: `${heuteUndMorgen.length} Frist${heuteUndMorgen.length === 1 ? '' : 'en'} heute / morgen`,
      sub: heuteUndMorgen[0].titel,
      color: C.warning, bg: C.warningLight,
      action: () => router.push({ pathname: '/detail', params: { dokId: heuteUndMorgen[0].id } }),
      actionLabel: 'Öffnen →', priority: 9 });
  }

  const ungelesen = docs.filter(d => !d.gelesen && !d.erledigt);
  if (ungelesen.length > 0) {
    cards.push({ id: 'ungelesen', emoji: '📬',
      title: `${ungelesen.length} ungelesen${ungelesen.length === 1 ? 'es Dokument' : 'e Dokumente'}`,
      sub: 'Ein erster Blick ist meist der wichtigste Schritt',
      color: C.primary, bg: C.primaryLight,
      action: () => router.push({ pathname: '/detail', params: { dokId: ungelesen[0].id } }),
      actionLabel: 'Öffnen →', priority: 7 });
  }

  const dieseWoche = docs.filter(d => {
    if (!d.frist || d.erledigt) return false;
    const days = Math.ceil((new Date(d.frist).getTime() - heute.getTime()) / 86400000);
    return days > 1 && days <= 7;
  });
  if (dieseWoche.length > 0) {
    cards.push({ id: 'deadline', emoji: '📅',
      title: `${dieseWoche.length} Frist${dieseWoche.length === 1 ? '' : 'en'} diese Woche`,
      sub: dieseWoche.map(d => d.absender || d.titel).slice(0, 2).join(', '),
      color: C.success, bg: C.successLight,
      action: () => router.push({ pathname: '/detail', params: { dokId: dieseWoche[0].id } }),
      actionLabel: 'Im Kalender eintragen →', priority: 6 });
  }

  const mitAufgaben = docs.filter(d => d.aufgaben?.some(a => !a.erledigt));
  if (mitAufgaben.length > 0) {
    const total = mitAufgaben.reduce((s, d) => s + (d.aufgaben ?? []).filter(a => !a.erledigt).length, 0);
    cards.push({ id: 'aufgaben', emoji: '✅',
      title: `${total} offene${total === 1 ? ' Aufgabe' : ' Aufgaben'}`,
      sub: (mitAufgaben[0].aufgaben ?? []).find(a => !a.erledigt)?.titel || '',
      color: C.primaryDark, bg: C.primaryLight, action: () => {}, actionLabel: 'Zu den Aufgaben →', priority: 5 });
  }

  if (cards.length === 0 && docs.length === 0) {
    cards.push({ id: 'willkommen', emoji: '📷', title: 'Erstes Dokument einlesen',
      sub: 'Fotografieren Sie einen Brief — BriefPilot analysiert ihn sofort',
      color: C.primary, bg: C.primaryLight,
      action: () => router.push('/(tabs)/Kamera'), actionLabel: 'Kamera öffnen →', priority: 4 });
  }

  if (cards.length === 0) {
    cards.push({ id: 'allgut', emoji: '✨', title: 'Alles unter Kontrolle',
      sub: 'Wir benachrichtigen Sie, sobald ein neues Dokument eintrifft',
      color: C.success, bg: C.successLight, action: null, actionLabel: null, priority: 1 });
  }

  return cards.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

interface ContextualGuidanceProps {
  docs?: Dokument[];
  router: { push: (route: any) => void };
}

export default function ContextualGuidance({ docs = [], router }: ContextualGuidanceProps) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const cards = useMemo(() => buildCards(docs, router, C), [docs, C]);

  if (!cards.length) return null;

  return (
    <View style={{ marginBottom: S.sm }}>
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginLeft: S.lg, marginBottom: 8 }}>
        WAS STEHT HEUTE AN?
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.lg, gap: 10 }}>
        {cards.map(card => (
          <TouchableOpacity
            key={card.id}
            onPress={card.action || undefined}
            activeOpacity={card.action ? 0.75 : 1}
            accessibilityRole="button"
            accessibilityLabel={card.actionLabel ? `${card.title}. ${card.actionLabel}` : card.title}
            style={{ width: 200, borderRadius: R.lg, padding: S.md, backgroundColor: card.bg,
              borderWidth: 1, borderColor: card.color + '40', ...Shadow.sm }}>
            <Text style={{ fontSize: 22, marginBottom: 6 }}>{card.emoji}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: card.color, lineHeight: 18, marginBottom: 3 }}>{card.title}</Text>
            {card.sub ? (
              <Text style={{ fontSize: 11, color: card.color + 'BB', lineHeight: 15, marginBottom: 8 }} numberOfLines={2}>{card.sub}</Text>
            ) : null}
            {card.actionLabel && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: card.color }}>{card.actionLabel}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
