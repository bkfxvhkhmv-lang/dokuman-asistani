import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { Dokument } from '@/store';

/** Sunucuda OCR / Verarbeitungsstatus (`v4JobStatus`). */
export default function V4JobStatusRibbon({ dok }: { dok: Dokument }) {
  const { Colors: C, S, R } = useTheme();
  const status = dok.v4JobStatus;
  if (!status || status === 'completed') return null;

  let line: string;
  if (status === 'pending') line = 'Dokument wird vorbereitet …';
  else if (status === 'processing') line = 'Dokument wird analysiert …';
  else if (status === 'failed') line = 'Analyse fehlgeschlagen';
  else line = 'Status: Unbekannt';

  return (
    <View
      style={{
        marginHorizontal: S.md,
        marginBottom: S.sm,
        paddingVertical: S.sm,
        paddingHorizontal: S.md,
        borderRadius: R.md,
        backgroundColor: status === 'failed' ? `${C.danger}18` : C.primaryLight,
        borderWidth: 0.5,
        borderColor: status === 'failed' ? `${C.danger}55` : C.border,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '600', color: C.text, textAlign: 'center' }}>
        {line}
      </Text>
    </View>
  );
}
