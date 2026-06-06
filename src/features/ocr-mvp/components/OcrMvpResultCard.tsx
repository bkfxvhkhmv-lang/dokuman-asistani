import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import StickyBottomCTA from '@/design/components/StickyBottomCTA';
import HeaderIconButton from '@/design/components/HeaderIconButton';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import { downloadOcrResult } from '@/services/ocrMvpApi';
import { OCR_MVP_BASE } from '@/config';
import type { OcrMvpJobStatus } from '@/services/ocrMvpApi';
import { buildHumanExportBasename } from '@/utils/exportFilename';
import OcrMvpActionSummary from './OcrMvpActionSummary';
import { useT } from '@/hooks/useT';

const DOC_TYPE_KEY: Record<string, string> = {
  invoice:    'ocr.doctype.invoice',
  settlement: 'ocr.doctype.settlement',
  insurance:  'ocr.doctype.insurance',
  quote:      'ocr.doctype.quote',
  form:       'ocr.doctype.form',
  letter:     'ocr.doctype.letter',
  unknown:    'ocr.doctype.unknown',
};

function buildExportFilename(
  summary: import('@/services/ocrMvpApi').OcrMvpActionSummary | undefined,
  docType: string | undefined,
  ext: string,
): string {
  const kind = summary?.kind ?? docType ?? 'unknown';
  const label = { invoice:'Rechnung', settlement:'Nebenkosten', insurance:'Versicherung', quote:'Angebot', form:'Formular', letter:'Brief', unknown:'Dokument' }[kind] ?? 'Dokument';
  const base = buildHumanExportBasename({
    sender: summary?.vendor_name || summary?.sender,
    title: summary?.vendor_name || summary?.sender || label,
    type: label,
    date: summary?.invoice_date || summary?.document_date,
  });
  return `${base}.${ext}`;
}

const HIGH_RISK_TYPES = new Set(['letter', 'insurance']);

interface Props {
  result: OcrMvpJobStatus;
  onReset: () => void;
  onSaveToDocuments?: () => void;
  isSavedToDocuments?: boolean;
  onOpenDocument?: () => void;
  onPickScan?: () => void;
  onPickFile?: () => void;
  onPickPhoto?: () => void;
  entryBusy?: boolean;
}

export default function OcrMvpResultCard({
  result,
  onReset,
  onSaveToDocuments,
  isSavedToDocuments,
  onOpenDocument,
  onPickScan,
  onPickFile,
  onPickPhoto,
  entryBusy,
}: Props) {
  const { Colors } = useTheme();
  const { t: T } = useT();
  const insets = useSafeAreaInsets();
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const docLabel = T(DOC_TYPE_KEY[result.document_type ?? ''] ?? 'ocr.doctype.unknown');
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
      Alert.alert(T('ocr.result.preview_unavailable_title'), e?.message ?? T('common.unknown_error'));
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
          T('ocr.result.file_saved_title'),
          T('ocr.result.file_saved_body'),
        );
      }
    } catch {
      Alert.alert(
        T('ocr.result.download_failed_title'),
        T('ocr.result.download_failed_body'),
      );
    } finally {
      setDownloading(false);
    }
  };

  const st = styles(Colors);

  return (
    <View style={st.container}>
      {/* Compact combined status line */}
      <View style={st.compactStatusLine}>
        <Icon name="checkmark-circle" size={13} color={Colors.success} />
        <Text style={st.compactStatusText}>
          {isSavedToDocuments ? T('ocr.result.completed_saved_compact') : T('ocr.result.completed')}
        </Text>
      </View>

      {/* PRIMARY CTA */}
      {isSavedToDocuments ? (
        onOpenDocument && (
          <TouchableOpacity style={st.savePrimaryBtn} onPress={onOpenDocument} activeOpacity={0.8}>
            <Icon name="arrow-forward-circle-outline" size={18} color="#fff" />
            <Text style={st.savePrimaryLabel}>{T('ocr.result.open')}</Text>
          </TouchableOpacity>
        )
      ) : (
        onSaveToDocuments && (
          <TouchableOpacity style={st.savePrimaryBtn} onPress={onSaveToDocuments} activeOpacity={0.8}>
            <Icon name="folder-open-outline" size={18} color="#fff" />
            <Text style={st.savePrimaryLabel}>{T('ocr.result.save')}</Text>
          </TouchableOpacity>
        )
      )}

      {/* Action summary — always secondary */}
      <View style={st.secondaryZone}>
        <View style={st.secondaryDivider} />
        {hasSummary ? (
          <OcrMvpActionSummary
            summary={result.action_summary!}
            onPreview={handlePreview}
            onDownload={handleDownload}
            isPreviewing={previewing}
            isDownloading={downloading}
            actionsSecondary
            compactSecondary={isSavedToDocuments}
          />
        ) : (
          <>
            <View style={st.infoBlock}>
              <Row label={T('field.type')} value={docLabel} colors={Colors} />
            </View>

            <TouchableOpacity style={st.previewBtnSmall} onPress={handlePreview} disabled={previewing} activeOpacity={0.8}>
              {previewing
                ? <ActivityIndicator color={Colors.primary} size="small" />
                : <>
                    <Icon name="eye-outline" size={16} color={Colors.primary} />
                    <Text style={st.secondaryActionLabel}>{T('ocr.result.show_result')}</Text>
                  </>}
            </TouchableOpacity>

            <TouchableOpacity style={st.downloadBtnSmall} onPress={handleDownload} disabled={downloading} activeOpacity={0.8}>
              {downloading
                ? <ActivityIndicator color={Colors.textSecondary} size="small" />
                : <>
                    <Icon name="download-outline" size={16} color={Colors.textSecondary} />
                    <Text style={st.secondaryActionLabelMuted}>{isXlsx ? T('ocr.result.excel_export') : T('ocr.result.download')}</Text>
                  </>}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Risk uyarısı — her zaman göster (summary olsa da olmasa da) */}
      {isHighRisk && (
        <View style={[st.warnBox, st.warnBoxHigh]}>
          <Icon name="warning-outline" size={18} color="#FF6B6B" />
          <Text style={[st.warnText, st.warnTextHigh]}>
            {T('ocr.result.high_risk_notice')}
          </Text>
        </View>
      )}

      {/* Hafif inceleme uyarısı — sadece fallback modda */}
      {result.needs_review && !isHighRisk && !hasSummary && (
        <View style={st.warnBox}>
          <Icon name="warning-outline" size={18} color="#F59E0B" />
          <Text style={st.warnText}>{T('ocr.result.review_notice')}</Text>
        </View>
      )}



      {/* Compact new-analysis block */}
      <View style={st.newAnalysisBlock}>
        <View style={st.newAnalysisDivider} />
        <Text style={[st.newAnalysisHeading, { color: Colors.text }]}>{T('ocr.upload.headline')}</Text>
        <Text style={[st.newAnalysisHelper, { color: Colors.textSecondary }]}>{T('ocr.result.new_analysis_helper')}</Text>
        <View style={st.newAnalysisRow}>
          <TouchableOpacity
            style={[st.newAnalysisBtn, { borderColor: Colors.border, backgroundColor: Colors.bgCard }]}
            onPress={onPickScan ?? onReset}
            disabled={entryBusy}
            activeOpacity={0.8}
          >
            <Icon name="camera-outline" size={16} color={Colors.primary} />
            <Text style={[st.newAnalysisBtnLabel, { color: Colors.text }]} numberOfLines={1}>
              {T('ocr.upload.scan_title')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.newAnalysisBtn, { borderColor: Colors.border, backgroundColor: Colors.bgCard }]}
            onPress={onPickFile ?? onReset}
            disabled={entryBusy}
            activeOpacity={0.8}
          >
            <Icon name="document-outline" size={16} color={Colors.primary} />
            <Text style={[st.newAnalysisBtnLabel, { color: Colors.text }]} numberOfLines={1}>
              {T('ocr.upload.file_label')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.newAnalysisBtn, { borderColor: Colors.border, backgroundColor: Colors.bgCard }]}
            onPress={onPickPhoto ?? onReset}
            disabled={entryBusy}
            activeOpacity={0.8}
          >
            <Icon name="images-outline" size={16} color={Colors.primary} />
            <Text style={[st.newAnalysisBtnLabel, { color: Colors.text }]} numberOfLines={1}>
              {T('ocr.result.pick_photos')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Önizleme / Export modal */}
      <Modal visible={previewVisible} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
        <SafeAreaView style={st.modalRoot} edges={['bottom']}>
          <View style={[st.modalHeader, { paddingTop: Math.max(insets.top + 12, 28) }]}>
            <Text style={st.modalTitle}>{isXlsx ? T('ocr.result.data_preview') : T('ocr.result.preview_title')}</Text>
            <HeaderIconButton
              name="close"
              onPress={() => setPreviewVisible(false)}
              accessibilityLabel={T('common.close')}
              color={Colors.text}
              style={{ marginRight: -4 }}
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
                  {T('ocr.result.content_unavailable')}
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
              <Icon name="download-outline" size={20} color={Colors.primary} />
              <Text style={st.downloadLabel}>{isXlsx ? T('ocr.result.excel_export') : T('ocr.result.download')}</Text>
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
  const { t: T } = useT();
  if (!fields?.length && !tables?.length) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 48, gap: 12 }}>
        <Icon name="grid-outline" size={48} color={C.textSecondary} />
        <Text style={{ color: C.textSecondary, fontSize: 14, textAlign: 'center' }}>
          {T('ocr.result.no_preview_data')}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 24 }}>
      {fields && fields.length > 0 && (
        <View>
          <Text style={{ color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
            {T('ocr.result.form_fields')}
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
                      <Text style={{ flex: 1, color: C.text, fontSize: 13, fontWeight: '500', textAlign: 'right' }} numberOfLines={2}>{f.value || T('common.none')}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {tables && tables.map((t, ti) => (
        <View key={ti}>
          <Text style={{ color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
            {T('ocr.result.table_meta', { index: ti + 1, rows: t.rows, cols: t.cols })}
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
                      }} numberOfLines={2}>{cell || T('common.none')}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          {t.rows > 5 && (
            <Text style={{ color: C.textTertiary, fontSize: 11, marginTop: 6, textAlign: 'center' }}>
              {T('ocr.result.preview_rows', { shown: 5, total: t.rows })}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container:       { padding: 20, gap: 16 },
  compactStatusLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compactStatusText: { color: C.success, fontSize: 12, fontWeight: '600', flex: 1 },
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
  previewBtnSmall: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: C.primary, backgroundColor: (C as any).primaryLight ?? C.bgCard,
  },
  downloadBtnSmall: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard,
  },
  secondaryActionLabel:     { color: C.primary, fontSize: 14, fontWeight: '600' },
  secondaryActionLabelMuted: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
  downloadLabel: { color: C.primary, fontSize: 16, fontWeight: '700' },
  savePrimaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15,
  },
  savePrimaryLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryZone:   { gap: 10, opacity: 0.85 },
  secondaryDivider: {
    height: StyleSheet.hairlineWidth, backgroundColor: C.border,
    marginHorizontal: 8, marginBottom: 2,
  },
  newAnalysisBlock:   { gap: 10, marginTop: 4 },
  newAnalysisDivider: {
    height: StyleSheet.hairlineWidth, backgroundColor: C.border,
    marginHorizontal: 4, marginBottom: 2,
  },
  newAnalysisHeading: { fontSize: 15, fontWeight: '700' },
  newAnalysisHelper:  { fontSize: 12, lineHeight: 17 },
  newAnalysisRow:     { flexDirection: 'row', gap: 8 },
  newAnalysisBtn:     {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', gap: 5,
  },
  newAnalysisBtnLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  modalRoot:     { flex: 1, backgroundColor: C.bg },
  modalHeader:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  modalDownloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard,
  },
  modalTitle:    { color: C.text, fontSize: 17, fontWeight: '700' },
  modalScroll:   { flex: 1 },
  previewText:   { color: C.text, fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
});
