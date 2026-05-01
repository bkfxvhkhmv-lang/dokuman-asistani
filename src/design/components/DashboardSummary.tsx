import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import { useT } from '@/hooks/useT';

type Props = {
  urgent: number;
  openTasks: number;
  amountOpen: number;
  nextDeadlineDays?: number | null;
  nextDeadlineTitle?: string | null;
  currency?: string;
  onPruefe?: () => void;
  onFrist?: () => void;
  onScan?: () => void;
};

export default function DashboardSummary({
  urgent, openTasks, nextDeadlineDays, nextDeadlineTitle,
  onPruefe, onFrist, onScan,
}: Props) {
  const { Colors: C, fs } = useTheme();
  const { t: T } = useT();

  const fristLabel = nextDeadlineDays == null ? T('dash.next_due')
    : nextDeadlineDays < 0  ? T('doc.overdue')
    : nextDeadlineDays === 0 ? T('doc.today')
    : nextDeadlineDays === 1 ? T('doc.tomorrow')
    : T('doc.due_days', { n: nextDeadlineDays });

  const fristColor = nextDeadlineDays != null && nextDeadlineDays <= 3 ? C.danger
    : nextDeadlineDays != null && nextDeadlineDays <= 7 ? C.warning
    : C.textSecondary;

  const hasAlert = urgent > 0 || (nextDeadlineDays != null && nextDeadlineDays <= 3);

  return (
    <View style={st.wrap}>
      {/* Alert row — nur wenn etwas dringend */}
      {hasAlert && (
        <TouchableOpacity
          onPress={urgent > 0 ? onPruefe : onFrist}
          activeOpacity={0.7}
          style={[st.alertRow, { backgroundColor: `${C.danger}0D`, borderColor: `${C.danger}20` }]}
        >
          <View style={[st.alertDot, { backgroundColor: C.danger }]} />
          <Text style={[st.alertText, { color: C.danger, fontSize: fs(13) }]}>
            {urgent > 0
              ? `${urgent} ${urgent === 1 ? T('home.doc_singular') : T('home.doc_plural')} zur Prüfung`
              : `${T('dash.next_due')}: ${fristLabel}`}
          </Text>
          <Icon name="chevron-right" size={14} color={C.danger} />
        </TouchableOpacity>
      )}

      {/* Action row */}
      <View style={st.row}>
        {/* Frist */}
        <TouchableOpacity onPress={onFrist} activeOpacity={0.7} style={[st.card, { backgroundColor: C.bgCard, borderColor: C.borderLight }]}>
          <Icon name="calendar" size={18} color={fristColor} />
          <Text style={[st.cardValue, { color: fristColor, fontSize: fs(15) }]} numberOfLines={1}>
            {fristLabel}
          </Text>
          <Text style={[st.cardSub, { color: C.textSecondary, fontSize: fs(11) }]} numberOfLines={1}>
            {nextDeadlineTitle ?? T('dash.next_due')}
          </Text>
        </TouchableOpacity>

        {/* Scan CTA */}
        <TouchableOpacity onPress={onScan} activeOpacity={0.75} style={[st.scanCard, { backgroundColor: C.primary }]}>
          <Icon name="scan" size={22} color="#fff" />
          <Text style={[st.scanLabel, { fontSize: fs(13) }]}>{T('dash.scan_now')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:      { paddingHorizontal: 20, marginBottom: 8, gap: 10 },
  alertRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  alertDot:  { width: 6, height: 6, borderRadius: 3 },
  alertText: { flex: 1, fontWeight: '600' },
  row:       { flexDirection: 'row', gap: 10 },
  card:      { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  cardValue: { fontWeight: '700', letterSpacing: -0.3 },
  cardSub:   { fontWeight: '500' },
  scanCard:  { width: 80, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  scanLabel: { color: '#fff', fontWeight: '700' },
});
