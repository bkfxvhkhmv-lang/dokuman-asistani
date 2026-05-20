import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import { downloadOcrResult } from '@/services/ocrMvpApi';
import type { OcrMvpJobStatus } from '@/services/ocrMvpApi';

const DOC_TYPE_LABEL: Record<string, string> = {
  invoice:    'Fatura',
  settlement: 'Kira Yan Giderleri',
  insurance:  'Sigorta Belgesi',
  quote:      'Teklif',
  form:       'Resmi Form',
  letter:     'Resmi Yazı',
  unknown:    'Tanımlanamayan Belge',
};

const HIGH_RISK_TYPES = new Set(['letter', 'insurance']);

interface Props {
  result: OcrMvpJobStatus;
  onReset: () => void;
}

export default function OcrMvpResultCard({ result, onReset }: Props) {
  const { Colors } = useTheme();
  const [downloading, setDownloading] = useState(false);

  const docLabel  = DOC_TYPE_LABEL[result.document_type ?? ''] ?? result.document_type ?? '—';
  const isHighRisk = HIGH_RISK_TYPES.has(result.document_type ?? '') && result.needs_review;
  const confPct   = result.confidence != null ? Math.round(result.confidence * 100) : null;

  const handleDownload = async () => {
    if (!result.job_id) return;
    setDownloading(true);
    try {
      const ext    = (result.document_type === 'letter' || result.document_type === 'insurance') ? 'md' : 'xlsx';
      const uri    = await downloadOcrResult(result.job_id, `briefpilot_output.${ext}`);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { UTI: ext === 'xlsx' ? 'com.microsoft.excel.xlsx' : 'public.plain-text' });
      } else {
        Alert.alert('İndirme tamamlandı', uri);
      }
    } catch (e: any) {
      Alert.alert('İndirme hatası', e?.message ?? 'Bilinmeyen hata');
    } finally {
      setDownloading(false);
    }
  };

  const st = styles(Colors);

  return (
    <View style={st.container}>
      <View style={st.header}>
        <View style={st.successDot} />
        <Text style={st.successLabel}>Tamamlandı</Text>
      </View>

      <View style={st.infoBlock}>
        <Row label="Belge tipi" value={docLabel} colors={Colors} />
        {confPct !== null && (
          <Row label="Güven" value={result.confidence === 0 ? 'Zorla belirtildi' : `%${confPct}`} colors={Colors} />
        )}
      </View>

      {result.needs_review && (
        <View style={[st.warnBox, isHighRisk && st.warnBoxHigh]}>
          <Icon name="warning-outline" size={18} color={isHighRisk ? '#FF6B6B' : '#F59E0B'} />
          <Text style={[st.warnText, isHighRisk && st.warnTextHigh]}>
            {isHighRisk
              ? 'Bu belge hukuki veya vergi sonucu doğurabilir. Taslağı göndermeden önce uzman görüşü alın.'
              : 'Lütfen sonucu göndermeden önce kontrol edin.'}
          </Text>
        </View>
      )}

      <TouchableOpacity style={st.downloadBtn} onPress={handleDownload} disabled={downloading} activeOpacity={0.8}>
        {downloading
          ? <ActivityIndicator color="#fff" />
          : <>
              <Icon name="download-outline" size={20} color="#fff" />
              <Text style={st.downloadLabel}>Sonucu İndir / Aç</Text>
            </>}
      </TouchableOpacity>

      <TouchableOpacity style={st.resetBtn} onPress={onReset} activeOpacity={0.75}>
        <Text style={st.resetLabel}>Yeni Belge</Text>
      </TouchableOpacity>
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

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
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
  downloadBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 15,
  },
  downloadLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resetBtn:      { alignItems: 'center', paddingVertical: 12 },
  resetLabel:    { color: C.textSecondary, fontSize: 14 },
});
