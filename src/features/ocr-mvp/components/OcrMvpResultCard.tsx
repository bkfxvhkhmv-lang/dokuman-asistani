import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import IconButton from '@/components/IconButton';
import { downloadOcrResult } from '@/services/ocrMvpApi';
import { OCR_MVP_BASE } from '@/config';
import type { OcrMvpJobStatus } from '@/services/ocrMvpApi';
import OcrMvpActionSummary from './OcrMvpActionSummary';

const DOC_TYPE_LABEL: Record<string, string> = {
  invoice:    'Rechnung',
  settlement: 'Nebenkosten',
  insurance:  'Versicherungsdokument',
  quote:      'Angebot',
  form:       'Formular',
  letter:     'Behördenpost',
  unknown:    'Unbekanntes Dokument',
};

const HIGH_RISK_TYPES = new Set(['letter', 'insurance']);

interface Props {
  result: OcrMvpJobStatus;
  onReset: () => void;
  onSaveToDocuments?: () => void;
  isSavedToDocuments?: boolean;
}

export default function OcrMvpResultCard({ result, onReset, onSaveToDocuments, isSavedToDocuments }: Props) {
  const { Colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const docLabel   = DOC_TYPE_LABEL[result.document_type ?? ''] ?? result.document_type ?? '—';
  const isHighRisk = HIGH_RISK_TYPES.has(result.document_type ?? '') && result.needs_review;
  const confPct    = result.confidence != null ? Math.round(result.confidence * 100) : null;
  const hasSummary = !!result.action_summary;

  // output_path uzantısından çıktı formatını belirle — document_type'a güvenme
  const outputExt = result.output_path?.split('.').pop()?.toLowerCase();
  const isXlsx = outputExt === 'xlsx';

  const handlePreview = async () => {
    if (!result.job_id) return;
    if (isXlsx) {
      // xlsx binary'yi text olarak render etmeye çalışma
      setPreviewText(null);
      setPreviewVisible(true);
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch(`${OCR_MVP_BASE}/documents/${result.job_id}/download`);
      const text = await res.text();
      setPreviewText(text);
      setPreviewVisible(true);
    } catch (e: any) {
      Alert.alert('Vorschau nicht möglich', e?.message ?? 'Unbekannter Fehler');
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownload = async () => {
    if (!result.job_id) return;
    setDownloading(true);
    try {
      const ext      = outputExt ?? 'bin';
      const uti      = ext === 'xlsx' ? 'com.microsoft.excel.xlsx' : 'public.plain-text';
      const kind     = result.action_summary?.kind ?? 'unknown';
      const label    = DOC_TYPE_LABEL[kind] ?? 'Dokument';
      const today    = new Date();
      const dateStr  = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const filename = `${label}_${dateStr}.${ext}`;
      const uri      = await downloadOcrResult(result.job_id, filename);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: uti });
      } else {
        Alert.alert(
          'Datei gespeichert',
          'Die Datei wurde lokal zwischengespeichert. Bitte versuche es über die Teilen-Funktion erneut.',
        );
      }
    } catch {
      Alert.alert(
        'Download fehlgeschlagen',
        'Die Datei konnte nicht heruntergeladen werden. Bitte prüfe die Verbindung und versuche es erneut.',
      );
    } finally {
      setDownloading(false);
    }
  };

  const st = styles(Colors, insets.top);

  return (
    <View style={st.container}>
      {/* Başlık */}
      <View style={st.header}>
        <View style={st.successDot} />
        <Text style={st.successLabel}>Abgeschlossen</Text>
      </View>

      {/* Action summary paneli veya fallback */}
      {hasSummary ? (
        <OcrMvpActionSummary
          summary={result.action_summary!}
          onPreview={handlePreview}
          onDownload={handleDownload}
          isPreviewing={previewing}
          isDownloading={downloading}
        />
      ) : (
        <>
          <View style={st.infoBlock}>
            <Row label="Dokumenttyp" value={docLabel} colors={Colors} />
            {confPct !== null && confPct > 0 && (
              <Row label="Konfidenz" value={`${confPct} %`} colors={Colors} />
            )}
          </View>

          <TouchableOpacity style={st.previewBtn} onPress={handlePreview} disabled={previewing} activeOpacity={0.8}>
            {previewing
              ? <ActivityIndicator color={Colors.primary} />
              : <>
                  <Icon name="eye-outline" size={20} color={Colors.primary} />
                  <Text style={[st.downloadLabel, { color: Colors.primary }]}>Ergebnis anzeigen</Text>
                </>}
          </TouchableOpacity>

          <TouchableOpacity style={st.downloadBtn} onPress={handleDownload} disabled={downloading} activeOpacity={0.8}>
            {downloading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Icon name="download-outline" size={20} color="#fff" />
                  <Text style={st.downloadLabel}>Herunterladen / Teilen</Text>
                </>}
          </TouchableOpacity>
        </>
      )}

      {/* Risk uyarısı — her zaman göster (summary olsa da olmasa da) */}
      {isHighRisk && (
        <View style={[st.warnBox, st.warnBoxHigh]}>
          <Icon name="warning-outline" size={18} color="#FF6B6B" />
          <Text style={[st.warnText, st.warnTextHigh]}>
            Dieses Dokument kann rechtliche oder steuerliche Konsequenzen haben. Bitte holen Sie vor dem Versand eine Expertenmeinung ein.
          </Text>
        </View>
      )}

      {/* Hafif inceleme uyarısı — sadece fallback modda */}
      {result.needs_review && !isHighRisk && !hasSummary && (
        <View style={st.warnBox}>
          <Icon name="warning-outline" size={18} color="#F59E0B" />
          <Text style={st.warnText}>Bitte prüfen Sie das Ergebnis, bevor Sie es weiterleiten.</Text>
        </View>
      )}

      {hasSummary && confPct !== null && confPct > 0 && (
        <Text style={[st.techLine, { color: Colors.textTertiary }]}>
          {`${confPct} % Konfidenz`}
        </Text>
      )}

      {onSaveToDocuments && (
        <TouchableOpacity
          style={[st.saveBtn, isSavedToDocuments && st.saveBtnDone]}
          onPress={onSaveToDocuments}
          disabled={!!isSavedToDocuments}
          activeOpacity={0.8}
        >
          <Icon
            name={isSavedToDocuments ? 'checkmark-circle-outline' : 'folder-open-outline'}
            size={20}
            color="#fff"
          />
          <Text style={st.saveBtnLabel}>
            {isSavedToDocuments ? 'Gespeichert' : 'In Dokumente speichern'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={st.resetBtn} onPress={onReset} activeOpacity={0.75}>
        <Text style={st.resetLabel}>Neue Analyse</Text>
      </TouchableOpacity>

      {/* Önizleme / Export modal */}
      <Modal visible={previewVisible} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
        <SafeAreaView style={st.modalRoot} edges={['bottom']}>
          <View style={st.modalHeader}>
            <Text style={st.modalTitle}>{isXlsx ? 'Datenvorschau' : 'Ergebnisvorschau'}</Text>
            <IconButton
              onPress={() => setPreviewVisible(false)}
              style={st.closeBtn}
              activeOpacity={0.6}
              accessibilityLabel="Schließen"
            >
              <Icon name="close" size={22} color={Colors.text} />
            </IconButton>
          </View>
          <ScrollView style={st.modalScroll} contentContainerStyle={{ padding: 16 }}>
            {isXlsx ? (
              <DatenvorschauContent
                fields={result.action_summary?.fields}
                tables={result.action_summary?.tables}
                C={Colors}
              />
            ) : previewText && previewText.trim().length > 0 ? (
              <Text style={st.previewText} selectable>{previewText}</Text>
            ) : (
              <View style={{ alignItems: 'center', paddingTop: 48, gap: 12 }}>
                <Icon name="document-outline" size={48} color={Colors.textSecondary} />
                <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                  Inhalt konnte nicht geladen werden.
                </Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity
            style={st.downloadBtn}
            onPress={() => { setPreviewVisible(false); handleDownload(); }}
            activeOpacity={0.8}
          >
            <Icon name="download-outline" size={20} color="#fff" />
            <Text style={st.downloadLabel}>Herunterladen / Teilen</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['Colors'] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function DatenvorschauContent({
  fields,
  tables,
  C,
}: {
  fields?: { name: string; value: string }[];
  tables?: { rows: number; cols: number; preview: string[][] }[];
  C: ReturnType<typeof useTheme>['Colors'];
}) {
  if (!fields?.length && !tables?.length) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 48, gap: 12 }}>
        <Icon name="grid-outline" size={48} color={C.textSecondary} />
        <Text style={{ color: C.textSecondary, fontSize: 14, textAlign: 'center' }}>
          Keine Vorschaudaten verfügbar.
        </Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 24 }}>
      {fields && fields.length > 0 && (
        <View>
          <Text style={{ color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
            Formularfelder
          </Text>
          <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border }}>
            {fields.map((f, i) => (
              <View key={i} style={{
                flexDirection: 'row',
                paddingHorizontal: 14, paddingVertical: 10,
                backgroundColor: i % 2 === 0 ? C.bgCard : C.bg,
                borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0,
                borderTopColor: C.border,
              }}>
                <Text style={{ flex: 1, color: C.textSecondary, fontSize: 13 }} numberOfLines={2}>{f.name}</Text>
                <Text style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: '500', textAlign: 'right' }} numberOfLines={2}>{f.value || '—'}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {tables && tables.map((t, ti) => (
        <View key={ti}>
          <Text style={{ color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
            {`Tabelle ${ti + 1} · ${t.rows} Zeilen · ${t.cols} Spalten`}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
            <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border }}>
              {t.preview.map((row, ri) => (
                <View key={ri} style={{
                  flexDirection: 'row',
                  backgroundColor: ri === 0 ? C.bgCard : (ri % 2 === 1 ? C.bg : C.bgCard),
                  borderTopWidth: ri > 0 ? StyleSheet.hairlineWidth : 0,
                  borderTopColor: C.border,
                }}>
                  {row.map((cell, ci) => (
                    <View key={ci} style={{
                      width: 110, paddingHorizontal: 10, paddingVertical: 8,
                      borderLeftWidth: ci > 0 ? StyleSheet.hairlineWidth : 0,
                      borderLeftColor: C.border,
                    }}>
                      <Text style={{
                        color: ri === 0 ? C.text : C.textSecondary,
                        fontSize: 12,
                        fontWeight: ri === 0 ? '600' : '400',
                      }} numberOfLines={2}>{cell || '—'}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          {t.rows > 5 && (
            <Text style={{ color: C.textTertiary, fontSize: 11, marginTop: 6, textAlign: 'center' }}>
              {`Vorschau: 5 von ${t.rows} Zeilen`}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors'], insetsTop: number) => StyleSheet.create({
  container:    { padding: 20, gap: 16 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  successDot:   { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E' },
  successLabel: { color: '#22C55E', fontSize: 16, fontWeight: '700' },
  infoBlock:    {
    backgroundColor: C.bgCard, borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: C.border,
  },
  warnBox:      {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F59E0B18', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F59E0B40',
  },
  warnBoxHigh:  { backgroundColor: '#FF6B6B18', borderColor: '#FF6B6B40' },
  warnText:     { flex: 1, color: '#F59E0B', fontSize: 13, lineHeight: 18 },
  warnTextHigh: { color: '#FF6B6B' },
  previewBtn:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15,
    borderWidth: 1.5, borderColor: C.primary, backgroundColor: (C as any).primaryLight ?? C.bgCard,
  },
  downloadBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 15,
    marginHorizontal: 16, marginBottom: 16,
  },
  downloadLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  techLine:      { fontSize: 11, textAlign: 'center' },
  saveBtn:       {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15,
  },
  saveBtnDone:   { backgroundColor: '#22C55E' },
  saveBtnLabel:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  resetBtn:      { alignItems: 'center', paddingVertical: 12 },
  resetLabel:    { color: C.textSecondary, fontSize: 14 },
  modalRoot:     { flex: 1, backgroundColor: C.bg },
  modalHeader:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: insetsTop + 16, paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  closeBtn:      { padding: 12, marginRight: -4 },
  modalTitle:    { color: C.text, fontSize: 17, fontWeight: '700' },
  modalScroll:   { flex: 1 },
  previewText:   { color: C.text, fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
});
