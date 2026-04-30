import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useStore, type Dokument } from '@/store';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import type { PipelineUiPhase } from '@/utils/documentPipelineStatus';
import { getDocumentPipelineInfo } from '@/utils/documentPipelineStatus';

function phaseColors(phase: PipelineUiPhase, C: ThemeColors) {
  switch (phase) {
    case 'error':
      return { bg: C.dangerLight, border: `${C.danger}55`, label: C.dangerText };
    case 'processing':
      return { bg: C.warningLight, border: `${C.warning}66`, label: C.warningText ?? C.warning };
    case 'pending':
      return { bg: C.bgInput, border: C.border, label: C.textSecondary };
    default:
      return { bg: C.successLight, border: `${C.success}44`, label: C.successText };
  }
}

type Props = {
  dok: Dokument & { isOptimistic?: boolean };
  /** Re-upload + Polling erneut starten (nach fehlgeschlagener Server-Analyse). */
  onRetryPipelineAnalysis?: () => void;
};

/** Pipeline sichtbar machen + Sync-CTA; bei abgeschlossener Analyse wird nichts gerendert. */
export default function DocumentAnalysisProgressCard({ dok, onRetryPipelineAnalysis }: Props) {
  const { Colors: C, S, R, fs } = useTheme();
  const { dispatch } = useStore();
  const { sync, status: syncStatus } = useSyncEngine();
  const [busy, setBusy] = useState(false);

  const info = useMemo(() => getDocumentPipelineInfo(dok), [dok]);
  if (info.phase === 'completed') return null;

  const tone = phaseColors(info.phase, C);

  const stepText =
    dok.v4JobStatus === 'failed'
      ? 'error'
      : info.phase === 'pending' || info.phase === 'processing'
        ? 'active'
        : 'done';
  const stepAi: 'done' | 'active' | 'wait' | 'error' =
    dok.v4JobStatus === 'failed'
      ? 'wait'
      : info.phase === 'processing'
        ? 'active'
        : 'wait';

  const onSync = useCallback(async () => {
    setBusy(true);
    try {
      await sync(dispatch, null);
    } finally {
      setBusy(false);
    }
  }, [dispatch, sync]);

  const stepLine = (
    label: string,
    state: 'done' | 'active' | 'wait' | 'error',
    key: string,
  ) => {
    const mark =
      state === 'done'
        ? '✓ '
        : state === 'active'
          ? '~ '
          : state === 'error'
            ? '⚠ '
            : '○ ';
    return (
      <Text
        key={key}
        style={{
          fontSize: fs(12),
          color: state === 'active' ? C.text : state === 'error' ? C.danger : C.textTertiary,
          fontWeight: state === 'active' ? '700' : '500',
          marginBottom: 4,
        }}
      >
        {mark}
        {label}
      </Text>
    );
  };

  return (
    <View
      style={{
        marginHorizontal: S.md,
        marginBottom: S.md,
        padding: 16,
        borderRadius: 12,
        backgroundColor: tone.bg,
        borderWidth: 1,
        borderColor: tone.border,
      }}
    >
      <Text style={{ fontSize: fs(11), fontWeight: '800', color: tone.label, letterSpacing: 0.6, marginBottom: 6 }}>
        DOKUMENT-ANALYSE
      </Text>
      <Text style={{ fontSize: fs(15), fontWeight: '700', color: C.text }} numberOfLines={1}>
        {dok.dateiName || dok.titel}
      </Text>
      <Text style={{ fontSize: fs(13), color: tone.label, marginTop: 6, marginBottom: S.sm }}>
        {info.phase === 'error'
          ? 'Die Analyse ist fehlgeschlagen. Bitte mit gutem WLAN erneut versuchen.'
          : 'Nach dem Speichern wird der Text erkannt und die Übersicht vorbereitet. Meist 5–15 Sekunden.'}
      </Text>

      <View style={{ marginTop: 4, marginBottom: S.md }}>
        {stepLine('Auf Gerät gespeichert', 'done', 'upload')}
        {stepLine('Text wird erkannt (OCR)', stepText as 'done' | 'active' | 'wait' | 'error', 'ocr')}
        {stepLine('KI‑Zusammenfassung & Felder', stepAi as 'done' | 'active' | 'wait' | 'error', 'ai')}
      </View>

      <Text style={{ fontSize: fs(11), color: C.textTertiary }}>
        ⏱ In der Regel 5–15 Sekunden nach Upload — bei großen oder unscharfen Briefen kann es etwas länger dauern.
      </Text>

      <TouchableOpacity
          onPress={info.phase === 'error' ? (onRetryPipelineAnalysis ?? onSync) : onSync}
          disabled={busy || syncStatus === 'syncing'}
          style={{
            marginTop: S.md,
            borderRadius: R.lg,
            paddingVertical: 12,
            alignItems: 'center',
            backgroundColor: info.phase === 'error' ? C.danger : C.primary,
            opacity: busy || syncStatus === 'syncing' ? 0.65 : 1,
          }}
        >
          {busy || syncStatus === 'syncing' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontSize: fs(14), fontWeight: '700', color: '#fff' }}>
              {info.phase === 'error' ? 'Erneut versuchen' : 'Mit Server aktualisieren'}
            </Text>
          )}
        </TouchableOpacity>
    </View>
  );
}
