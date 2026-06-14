import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { Dokument } from '@/store';
import { deriveDocumentTodoLines } from '@/utils/deriveDocumentTodoLines';

export default function DocumentTodosCard({ dok }: { dok: Dokument }) {
  const { Colors: C, S, R, fs } = useTheme();
  const lines = useMemo(() => deriveDocumentTodoLines(dok), [dok]);
  if (dok.erledigt || lines.length === 0) return null;

  return (
    <View style={{
      marginHorizontal: S.md,
      marginBottom: S.md,
      padding: 16,
      borderRadius: R.lg,
      backgroundColor: C.bgCard,
      borderWidth: 1,
      borderColor: `${C.primary}33`,
    }}>
      <Text style={{ fontSize: fs(11), fontWeight: '800', color: C.textTertiary, letterSpacing: 0.6, marginBottom: 10 }}>
        Nächste Schritte
      </Text>
      {lines.map((line, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.textTertiary, marginTop: fs(13) * 0.55 }} />
          <Text style={{ flex: 1, fontSize: fs(13), color: C.text, lineHeight: fs(13) * 1.45 }}>
            {line}
          </Text>
        </View>
      ))}
    </View>
  );
}
