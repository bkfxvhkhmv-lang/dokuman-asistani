import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import Icon from '@/components/Icon';

export default function ExportPlaceholder() {
  const { Colors: C, fs } = useTheme();
  const { t: T } = useT();
  return (
    <SafeAreaView style={[st.wrap, { backgroundColor: C.bg }]} edges={['top']}>
      <View style={st.body}>
        <Icon name="file-pdf" size={40} color={C.textTertiary} />
        <Text style={[st.title, { color: C.text, fontSize: fs(17) }]}>
          {T('export.title')}
        </Text>
        <Text style={[st.body2, { color: C.textSecondary, fontSize: fs(14) }]}>
          Export ist derzeit über die Dokumentansicht verfügbar.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  title: { fontWeight: '700', textAlign: 'center' },
  body2: { textAlign: 'center', lineHeight: 22 },
});
