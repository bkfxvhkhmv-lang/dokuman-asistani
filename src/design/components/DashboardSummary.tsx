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
};

export default function DashboardSummary({
  urgent, openTasks, nextDeadlineDays, nextDeadlineTitle,
  onPruefe, onFrist,
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
  const alertColor = urgent > 0 ? C.danger : C.warning;

  return (
    <View style={st.wrap}>
      {/* Alert row — nur wenn etwas dringend */}
      {hasAlert && (
        <TouchableOpacity
          onPress={urgent > 0 ? onPruefe : onFrist}
          activeOpacity={0.7}
          style={[st.alertRow, { backgroundColor: `${alertColor}0D`, borderColor: `${alertColor}20` }]}
        >
          <View style={[st.alertDot, { backgroundColor: alertColor }]} />
          <Text style={[st.alertText, { color: alertColor, fontSize: fs(13) }]}>
            {urgent > 0
              ? `${urgent} ${urgent === 1 ? T('home.doc_singular') : T('home.doc_plural')} zur Prüfung`
              : `${T('dash.next_due')}: ${fristLabel}`}
          </Text>
          <Icon name="chevron-right" size={14} color={alertColor} />
        </TouchableOpacity>
      )}

      {/* Action row — only show Frist card when real deadline data exists */}
      {(nextDeadlineDays != null || nextDeadlineTitle) && (
        <View style={st.row}>
          <TouchableOpacity onPress={onFrist} activeOpacity={0.7} style={[st.card, { backgroundColor: C.bgCard, borderColor: C.borderLight }]}>
            <Icon name="calendar" size={20} color={fristColor} />
            <Text style={[st.cardValue, { color: fristColor, fontSize: fs(15) }]} numberOfLines={1}>
              {fristLabel}
            </Text>
            <Text style={[st.cardSub, { color: C.textSecondary, fontSize: fs(11) }]} numberOfLines={1}>
              {nextDeadlineTitle}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
});
