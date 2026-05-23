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
      const uri      = await downloadOcrResult(result.job_id, `briefpilot_output.${ext}`);
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
            {confPct !== null && (
              <Row label="Konfidenz" value={result.confidence === 0 ? 'Manuell festgelegt' : `${confPct} %`} colors={Colors} />
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

      {/* Teknik detaylar — action summary varsa küçük alt satır olarak */}
      {hasSummary && (
        <Text style={[st.techLine, { color: Colors.textTertiary }]}>
          {result.provider ?? '—'}
          {confPct !== null ? `  ·  ${confPct === 0 ? 'Manuell festgelegt' : `${confPct} % Konfidenz`}` : ''}
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
            <Text style={st.modalTitle}>{isXlsx ? 'Excel-Datei bereit' : 'Ergebnisvorschau'}</Text>
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
              <View style={{ alignItems: 'center', paddingTop: 48, gap: 16 }}>
                <Icon name="document-outline" size={56} color={Colors.textSecondary} />
                <Text style={{ color: Colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                  Excel-Datei bereit
                </Text>
                <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                  Dieses Dokument wurde als Excel-Datei erstellt.{'\n'}Du kannst es herunterladen und teilen.
                </Text>
              </View>
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
