import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { OcrMvpActionSummary as ActionSummaryType } from '@/services/ocrMvpApi';

const KIND_LABEL: Record<string, string> = {
  invoice:    'Fatura',
  settlement: 'Kira Yan Giderleri',
  form:       'Form Belgesi',
  letter:     'Resmi Yazı',
  insurance:  'Sigorta Belgesi',
  quote:      'Teklif',
};

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  dusuk:  { label: 'Düşük Risk',  color: '#22C55E', bg: '#22C55E18' },
  orta:   { label: 'Orta Risk',   color: '#F59E0B', bg: '#F59E0B18' },
  yuksek: { label: 'Yüksek Risk', color: '#FF6B6B', bg: '#FF6B6B18' },
};

type ActionHandler = 'preview' | 'download' | 'soon';
interface ActionCfg { label: string; icon: string; handler: ActionHandler }

const ACTION_MAP: Record<string, ActionCfg> = {
  export_excel:          { label: "Excel'e Aktar",      icon: 'download-outline',          handler: 'download' },
  export_share:          { label: 'Paylaş',             icon: 'share-outline',             handler: 'download' },
  show_fields:           { label: 'Alanları Gör',       icon: 'list-outline',              handler: 'preview'  },
  show_summary:          { label: 'Özeti Gör',          icon: 'document-text-outline',     handler: 'preview'  },
  create_reply_draft:    { label: 'Taslağı Gör',        icon: 'create-outline',            handler: 'preview'  },
  add_payment_reminder:  { label: 'Ödeme Hatırlatıcı',  icon: 'alarm-outline',             handler: 'soon'     },
  add_deadline_reminder: { label: 'Takvime Frist Ekle', icon: 'calendar-outline',          handler: 'soon'     },
  review_missing_fields: { label: 'Eksikleri Kontrol',  icon: 'checkmark-circle-outline',  handler: 'soon'     },
  manual_review:         { label: 'Uzman İçin Not',     icon: 'alert-circle-outline',      handler: 'soon'     },
};

interface Props {
  summary: ActionSummaryType;
  onPreview: () => void;
  onDownload: () => void;
  isPreviewing: boolean;
  isDownloading: boolean;
}

export default function OcrMvpActionSummary({
  summary, onPreview, onDownload, isPreviewing, isDownloading,
}: Props) {
  const { Colors } = useTheme();
  const st = styles(Colors);

  const kind      = summary.kind ?? 'unknown';
  const kindLabel = KIND_LABEL[kind] ?? 'Belge';
  const rawTitle  = summary.title;
  const title     = (!rawTitle || rawTitle === 'input') ? null : rawTitle;
  const riskCfg   = summary.risk_level ? RISK_CONFIG[summary.risk_level] : null;

  const handlePress = (handler: ActionHandler) => {
    if (handler === 'preview')  { onPreview();  return; }
    if (handler === 'download') { onDownload(); return; }
    Alert.alert('Yakında', 'Bu özellik yakında eklenecek.');
  };

  const actions = (summary.recommended_actions ?? []).slice(0, 3);

  return (
    <View style={st.container}>
      {/* Belge tipi + risk badge */}
      <View style={st.titleRow}>
        <View style={[st.kindChip, { borderColor: Colors.primary + '55', backgroundColor: (Colors as any).primaryLight ?? Colors.bgCard }]}>
          <Text style={[st.kindChipText, { color: Colors.primary }]}>{kindLabel}</Text>
        </View>
        {riskCfg && (
          <View style={[st.riskBadge, { backgroundColor: riskCfg.bg }]}>
            <Text style={[st.riskLabel, { color: riskCfg.color }]}>{riskCfg.label}</Text>
          </View>
        )}
      </View>

      {title && <Text style={[st.title, { color: Colors.text }]} numberOfLines={2}>{title}</Text>}

      {/* Form / Settlement meta */}
      {(kind === 'form' || kind === 'settlement') && (
        <View style={st.metaRow}>
          {summary.fields_count != null && <MetaChip label={`${summary.fields_count} alan`} C={Colors} />}
          {summary.tables_count != null && <MetaChip label={`${summary.tables_count} tablo`} C={Colors} />}
          {summary.lines_count  != null && <MetaChip label={`${summary.lines_count} satır`}  C={Colors} />}
        </View>
      )}

      {/* Invoice meta */}
      {kind === 'invoice' && (
        <View style={st.metaRow}>
          {(summary.total_brutto ?? summary.amount) != null && (
            <MetaChip
              label={`${summary.currency ?? 'EUR'} ${summary.total_brutto ?? summary.amount}`}
              C={Colors}
              large
            />
          )}
          {summary.line_items_count != null && (
            <MetaChip label={`${summary.line_items_count} kalem`} C={Colors} />
          )}
        </View>
      )}

      {/* Letter / Insurance meta */}
      {(kind === 'letter' || kind === 'insurance') && (
        <View style={st.letterMeta}>
          {summary.sender && (
            <View style={st.metaLine}>
              <Icon name="business-outline" size={14} color={Colors.textSecondary} />
              <Text style={[st.metaLineText, { color: Colors.textSecondary }]} numberOfLines={1}>
                {summary.sender}
              </Text>
            </View>
          )}
          {summary.deadline && (
            <View style={st.metaLine}>
              <Icon name="calendar-outline" size={14} color="#F59E0B" />
              <Text style={[st.metaLineText, { color: '#F59E0B', fontWeight: '700' }]}>
                Son tarih: {summary.deadline}
              </Text>
            </View>
          )}
          {summary.summary && (
            <Text style={[st.summaryText, { color: Colors.textSecondary }]} numberOfLines={5}>
              {summary.summary}
            </Text>
          )}
        </View>
      )}

      {/* Aksiyon butonları */}
      {actions.length > 0 && (
        <View style={st.actionList}>
          {actions.map((key, idx) => {
            const cfg = ACTION_MAP[key];
            if (!cfg) return null;
            const isSoon      = cfg.handler === 'soon';
            const isLoading   = (!isSoon) && (
              (cfg.handler === 'preview'  && isPreviewing) ||
              (cfg.handler === 'download' && isDownloading)
            );
            const isPrimary   = idx === 0 && !isSoon;
            const iconColor   = isSoon ? Colors.textTertiary : isPrimary ? '#fff' : Colors.primary;

            return (
              <TouchableOpacity
                key={key}
                style={[st.btn, isPrimary ? st.btnPrimary : isSoon ? st.btnSoon : st.btnOutline]}
                onPress={() => !isLoading && handlePress(cfg.handler)}
                activeOpacity={isSoon ? 1 : 0.8}
                disabled={isLoading}
              >
                {isLoading
                  ? <ActivityIndicator size="small" color={isPrimary ? '#fff' : Colors.primary} />
                  : <Icon name={cfg.icon} size={18} color={iconColor} />
                }
                <Text style={[
                  st.btnLabel,
                  isPrimary ? st.btnLabelPrimary : isSoon ? st.btnLabelSoon : st.btnLabelOutline,
                ]}>
                  {cfg.label}
                </Text>
                {isSoon && (
                  <View style={[st.soonTag, { borderColor: Colors.border }]}>
                    <Text style={[st.soonText, { color: Colors.textTertiary }]}>yakında</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function MetaChip({ label, C, large }: { label: string; C: ReturnType<typeof useTheme>['Colors']; large?: boolean }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: C.bgInput, marginRight: 6, marginBottom: 4 }}>
      <Text style={{ fontSize: large ? 15 : 12, color: C.text, fontWeight: large ? '700' : '600' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container:       { gap: 14 },
  titleRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  kindChip:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  kindChipText:    { fontSize: 12, fontWeight: '700' },
  riskBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  riskLabel:       { fontSize: 12, fontWeight: '700' },
  title:           { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  metaRow:         { flexDirection: 'row', flexWrap: 'wrap' },
  letterMeta:      { gap: 8 },
  metaLine:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLineText:    { fontSize: 13, flex: 1 },
  summaryText:     { fontSize: 13, lineHeight: 19 },
  actionList:      { gap: 10 },
  btn:             {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14,
  },
  btnPrimary:      { backgroundColor: C.primary },
  btnOutline:      { borderWidth: 1.5, borderColor: C.primary, backgroundColor: (C as any).primaryLight ?? C.bgCard },
  btnSoon:         { borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  btnLabel:        { fontSize: 15, fontWeight: '700' },
  btnLabelPrimary: { color: '#fff' },
  btnLabelOutline: { color: C.primary },
  btnLabelSoon:    { color: C.textTertiary },
  soonTag:         { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  soonText:        { fontSize: 10 },
});
