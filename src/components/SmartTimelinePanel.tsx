import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme, type ThemeColors } from '../ThemeContext';
import type { RadiusTokens } from '../theme';
import type { TimelineEvent, TimelineView, WochenZusammenfassung } from '../services/SmartTimelineService';

// ── Single event row ───────────────────────────────────────────────────────────

function EventRow({
  event, onPress, C, R,
}: { event: TimelineEvent; onPress: () => void; C: ThemeColors; R: RadiusTokens }) {
  const tage = event.tageVerbleibend;
  const isOverdue = tage !== null && tage < 0;
  const isToday   = tage === 0;
  const isSoon    = tage !== null && tage > 0 && tage <= 3;

  const statusColor = isOverdue ? C.danger
    : isToday        ? C.warning
    : isSoon         ? C.warning
    : event.priorität === 'kritisch' ? C.danger
    : event.priorität === 'hoch'     ? C.warning
    : C.success;

  const tageLabel = isOverdue
    ? `${Math.abs(tage!)} Tage überfällig`
    : isToday ? 'Heute'
    : tage !== null ? `${tage} Tag${tage !== 1 ? 'e' : ''}`
    : new Date(event.datum).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
        borderBottomWidth: 0.5, borderColor: C.border }}>
      <View style={{ width: 36, height: 36, borderRadius: 18,
        backgroundColor: `${statusColor}18`,
        alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16 }}>{event.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={1}>
          {event.label}
        </Text>
        <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 1 }} numberOfLines={1}>
          {event.dokumentTitel}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ backgroundColor: `${statusColor}18`, borderRadius: 8,
          paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: statusColor + '44' }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: statusColor }}>{tageLabel}</Text>
        </View>
        {event.aktionLabel && (
          <Text style={{ fontSize: 10, color: C.primary, marginTop: 3 }}>{event.aktionLabel}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ label, count, color, C }: { label: string; count: number; color: string; C: ThemeColors }) {
  if (count === 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.6, flex: 1 }}>
        {label.toUpperCase()} ({count})
      </Text>
    </View>
  );
}

// ── Wochenübersicht card ───────────────────────────────────────────────────────

function WochenCard({ summary, C, R }: { summary: WochenZusammenfassung; C: ThemeColors; R: RadiusTokens }) {
  if (summary.gesamt === 0) {
    return (
      <View style={{ backgroundColor: C.bgInput, borderRadius: R.lg, padding: 16,
        alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 28 }}>✅</Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.text, marginTop: 8 }}>
          Keine Termine diese Woche
        </Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
          Alles im grünen Bereich
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: C.bgInput, borderRadius: R.lg, padding: 14, marginBottom: 16,
      borderWidth: 0.5, borderColor: C.border }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary, marginBottom: 10 }}>
        DIESE WOCHE
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        {summary.überfälligCount > 0 && (
          <View style={{ flex: 1, backgroundColor: C.dangerLight, borderRadius: R.md, padding: 10, borderWidth: 1, borderColor: C.dangerBorder }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.danger }}>{summary.überfälligCount}</Text>
            <Text style={{ fontSize: 10, color: C.dangerText, fontWeight: '600' }}>ÜBERFÄLLIG</Text>
          </View>
        )}
        {summary.heuteCount > 0 && (
          <View style={{ flex: 1, backgroundColor: C.warningLight, borderRadius: R.md, padding: 10, borderWidth: 1, borderColor: C.warningBorder }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.warning }}>{summary.heuteCount}</Text>
            <Text style={{ fontSize: 10, color: C.warningText, fontWeight: '600' }}>HEUTE</Text>
          </View>
        )}
        <View style={{ flex: 1, backgroundColor: C.primaryLight, borderRadius: R.md, padding: 10, borderWidth: 1, borderColor: C.primary + '33' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.primary }}>{summary.dieseWocheCount}</Text>
          <Text style={{ fontSize: 10, color: C.primaryDark, fontWeight: '600' }}>DIESE WOCHE</Text>
        </View>
        {summary.gesamtBetrag > 0 && (
          <View style={{ flex: 1, backgroundColor: C.dangerLight, borderRadius: R.md, padding: 10, borderWidth: 1, borderColor: C.danger + '44' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.danger }} numberOfLines={1}>
              {summary.gesamtBetrag.toFixed(0)} €
            </Text>
            <Text style={{ fontSize: 10, color: C.dangerText, fontWeight: '600' }}>OFFEN</Text>
          </View>
        )}
      </View>
      {summary.kritischeDokumente.slice(0, 3).map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5,
            backgroundColor: (d.tage ?? 1) <= 0 ? C.danger : (d.tage ?? 1) <= 3 ? C.warning : C.success }} />
          <Text style={{ fontSize: 12, color: C.text, flex: 1 }} numberOfLines={1}>{d.titel}</Text>
          <Text style={{ fontSize: 11, color: C.textTertiary }}>
            {d.tage !== null ? (d.tage <= 0 ? 'Überfällig' : `${d.tage}T`) : '–'}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

interface SmartTimelinePanelProps {
  view: TimelineView;
  wochenZusammenfassung?: WochenZusammenfassung;
  showWochenCard?: boolean;
  maxPerSection?: number;
}

export default function SmartTimelinePanel({
  view, wochenZusammenfassung, showWochenCard = true, maxPerSection = 5,
}: SmartTimelinePanelProps) {
  const { Colors: C, R } = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const goToDok = (event: TimelineEvent) => {
    router.push({ pathname: '/detail', params: { dokId: event.dokumentId } });
  };

  const totalEvents = view.überfällig.length + view.heute.length
    + view.dieseWoche.length + view.diesenMonat.length;

  if (totalEvents === 0 && !showWochenCard) return null;

  const sections: { label: string; events: TimelineEvent[]; color: string }[] = [
    { label: 'Überfällig',     events: view.überfällig,   color: C.danger },
    { label: 'Heute',          events: view.heute,        color: C.warning },
    { label: 'Diese Woche',    events: view.dieseWoche,   color: C.warning },
    { label: 'Diesen Monat',   events: view.diesenMonat,  color: C.success },
    { label: 'Später',         events: view.später,       color: C.textTertiary },
  ];

  return (
    <View>
      {showWochenCard && wochenZusammenfassung && (
        <WochenCard summary={wochenZusammenfassung} C={C} R={R} />
      )}

      {sections.map(({ label, events, color }, sectionIdx) => {
        if (events.length === 0) return null;
        const visible = expanded ? events : events.slice(0, maxPerSection);
        return (
          <View key={label}>
            <SectionHeader label={label} count={events.length} color={color} C={C} />
            {visible.map((e, rowIdx) => {
              // #65 Time Tunnel: items further from "now" recede into depth
              const globalIdx = sectionIdx * maxPerSection + rowIdx;
              const depth     = Math.min(globalIdx / 8, 0.72);   // 0 = foreground, 0.72 = deepest
              const scale     = 1 - depth * 0.12;                // 1.0 → 0.91
              const opacity   = 1 - depth * 0.55;                // 1.0 → 0.60
              return (
                <Animated.View
                  key={e.id}
                  entering={FadeInDown.delay(globalIdx * 45).springify().damping(20).stiffness(200)}
                  layout={Layout.springify().damping(18).stiffness(200)}
                  style={{ transform: [{ scale }], opacity }}
                >
                  <EventRow event={e} onPress={() => goToDok(e)} C={C} R={R} />
                </Animated.View>
              );
            })}
          </View>
        );
      })}

      {!expanded && totalEvents > maxPerSection * 2 && (
        <TouchableOpacity
          onPress={() => setExpanded(true)}
          style={{ alignItems: 'center', paddingVertical: 12, marginTop: 8 }}>
          <Text style={{ fontSize: 13, color: C.primary }}>Alle {totalEvents} Ereignisse anzeigen →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
