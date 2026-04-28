import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../ThemeContext';
import { getTimeline } from '../services/v4Api';

const EVENT_ICONS: Record<string, string> = {
  DOCUMENT_CREATED: 'cloud-upload',
  OCR_COMPLETED: 'scan',
  EMBEDDING_COMPLETED: 'bulb',
  RULE_APPLIED: 'settings',
  USER_VIEWED: 'eye',
  USER_EDITED: 'create',
  MARKED_DONE: 'checkmark-circle',
  SHARED: 'share-social',
  ARCHIVED: 'archive',
  DELETED: 'trash',
};

interface TimelineEvent {
  event: string;
  created_at: string;
}

interface TimelineViewProps {
  docId?: string;
}

export default function TimelineView({ docId }: TimelineViewProps) {
  const { Colors } = useTheme();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) return;
    getTimeline(docId)
      .then(res => setEvents((res?.events ?? []) as unknown as TimelineEvent[]))
      .catch(e => console.warn('[TimelineView] getTimeline error', e))
      .finally(() => setLoading(false));
  }, [docId]);

  if (!docId) return null;
  if (loading) return <ActivityIndicator />;

  return (
    <ScrollView style={styles.container}>
      {events.map((ev, idx) => (
        <View key={idx} style={styles.row}>
          <View style={styles.iconBox}>
            <Icon name={EVENT_ICONS[ev.event] || 'time'} size={20} color={Colors.primary} />
          </View>
          <View style={styles.textBox}>
            <Text style={[styles.event, { color: Colors.text }]}>{ev.event}</Text>
            <Text style={[styles.date, { color: Colors.textTertiary }]}>{new Date(ev.created_at).toLocaleString()}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  row: { flexDirection: 'row', marginBottom: 16, alignItems: 'center' },
  iconBox: { width: 36, alignItems: 'center' },
  textBox: { flex: 1 },
  event: { fontSize: 14, fontWeight: '500' },
  date: { fontSize: 12, marginTop: 2 },
});
