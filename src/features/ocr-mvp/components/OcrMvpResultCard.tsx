import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StickyBottomCTA from '@/design/components/StickyBottomCTA';
import HeaderIconButton from '@/design/components/HeaderIconButton';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
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

const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss',
};

function sanitizeFilePart(s: string): string {
  return s
    .replace(/[äöüÄÖÜß]/g, m => UMLAUT_MAP[m] ?? m)
    .replace(/[^a-zA-Z0-9\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50);
}

function buildExportFilename(
  summary: import('@/services/ocrMvpApi').OcrMvpActionSummary | undefined,
  docType: string | undefined,
  ext: string,
): string {
  const kind  = summary?.kind ?? docType ?? 'unknown';
  const label = DOC_TYPE_LABEL[kind] ?? 'Dokument';

  const vendor = summary?.vendor_name || summary?.sender;
  const rawDate = summary?.invoice_date || summary?.document_date;
  const today = new Date();
  const dateStr = rawDate
    ? rawDate.slice(0, 10)
    : `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const timeStr = `${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}${String(today.getSeconds()).padStart(2, '0')}`;
  const uid = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');

  const parts: string[] = [label];
  if (vendor) parts.push(sanitizeFilePart(vendor));
  parts.push(dateStr);
  parts.push(`${timeStr}_${uid}`);

  return parts.join('_') + '.' + ext;
}

const HIGH_RISK_TYPES = new Set(['letter', 'insurance']);

interface Props {
  result: OcrMvpJobStatus;
  onReset: () => void;
  onSaveToDocuments?: () => void;
  isSavedToDocuments?: boolean;
  onOpenDocument?: () => void;
}

export default function OcrMvpResultCard({ result, onReset, onSaveToDocuments, isSavedToDocuments, onOpenDocument }: Props) {
  const { Colors } = useTheme();
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
      const filename = buildExportFilename(result.action_summary, result.document_type, ext);
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

  const st = styles(Colors);

  return (
    <View style={st.container}>
      {/* Status chip — sakin, küçük */}
      <View style={st.statusRow}>
        <View style={st.successChip}>
          <Icon name="checkmark-circle" size={13} color="#22C55E" />
          <Text style={st.successChipText}>Analyse abgeschlossen</Text>
        </View>
      </View>

      {/* PRIMARY CTA — kaydet veya aç */}
      {isSavedToDocuments ? (
        <View style={st.savedState}>
          <View style={st.savedBadge}>
            <Icon name="checkmark-circle" size={14} color="#22C55E" />
            <Text style={st.savedBadgeText}>Gespeichert</Text>
          </View>
          {onOpenDocument && (
            <TouchableOpacity style={st.savePrimaryBtn} onPress={onOpenDocument} activeOpacity={0.8}>
              <Icon name="arrow-forward-circle-outline" size={18} color="#fff" />
              <Text style={st.savePrimaryLabel}>Dokument öffnen</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : onSaveToDocuments && (
        <TouchableOpacity style={st.savePrimaryBtn} onPress={onSaveToDocuments} activeOpacity={0.8}>
          <Icon name="folder-open-outline" size={18} color="#fff" />
          <Text style={st.savePrimaryLabel}>In Dokumente speichern</Text>
        </TouchableOpacity>
      )}

      {/* Action summary paneli oder fallback — Excel export sekundär */}
      {hasSummary ? (
        <OcrMvpActionSummary
          summary={result.action_summary!}
          onPreview={handlePreview}
          onDownload={handleDownload}
          isPreviewing={previewing}
          isDownloading={downloading}
          actionsSecondary
        />
      ) : (
        <>
          <View style={st.infoBlock}>
            <Row label="Dokumenttyp" value={docLabel} colors={Colors} />
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



      <TouchableOpacity style={st.resetBtn} onPress={onReset} activeOpacity={0.75}>
        <Text style={st.resetLabel}>Neue Analyse</Text>
      </TouchableOpacity>

      {/* Önizleme / Export modal */}
      <Modal visible={previewVisible} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
        <SafeAreaView style={st.modalRoot} edges={['top', 'bottom']}>
          <View style={st.modalHeader}>
            <Text style={st.modalTitle}>{isXlsx ? 'Datenvorschau' : 'Ergebnisvorschau'}</Text>
            <HeaderIconButton
              name="close"
              onPress={() => setPreviewVisible(false)}
              accessibilityLabel="Schließen"
              color={Colors.text}
            />
          </View>
          <ScrollView style={st.modalScroll} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
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
          <StickyBottomCTA noBorder>
            <TouchableOpacity
              style={st.modalDownloadBtn}
              onPress={() => { setPreviewVisible(false); handleDownload(); }}
              activeOpacity={0.8}
            >
              <Icon name="download-outline" size={20} color="#fff" />
              <Text style={st.downloadLabel}>Herunterladen / Teilen</Text>
            </TouchableOpacity>
          </StickyBottomCTA>
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

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container:       { padding: 20, gap: 16 },
  statusRow:       { flexDirection: 'row' },
  successChip:     {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#22C55E18', borderWidth: 1, borderColor: '#22C55E40',
  },
  successChipText: { color: '#22C55E', fontSize: 12, fontWeight: '600' },
  infoBlock:    {
    backgroundColor: C.bgCard, borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: C.border,
  },
  warnBox:      {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F59E0B18', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F59E0B40',
  },
  warnBoxHigh:  { backgroundColor: '#F59E0B0E', borderColor: '#F59E0B30' },
  warnText:     { flex: 1, color: '#B45309', fontSize: 12, lineHeight: 17 },
  warnTextHigh: { color: '#B45309' },
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
  savePrimaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15,
  },
  savePrimaryLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  savedState:    { gap: 12 },
  savedBadge:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8,
  },
  savedBadgeText: { color: '#22C55E', fontSize: 13, fontWeight: '600' },
  resetBtn:      { alignItems: 'center', paddingVertical: 12 },
  resetLabel:    { color: C.textSecondary, fontSize: 14 },
  modalRoot:     { flex: 1, backgroundColor: C.bg },
  modalHeader:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  modalDownloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 15,
  },
  modalTitle:    { color: C.text, fontSize: 17, fontWeight: '700' },
  modalScroll:   { flex: 1 },
  previewText:   { color: C.text, fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
});
