import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { OcrMvpActionSummary as ActionSummaryType } from '@/services/ocrMvpApi';
import { humanizeTitle, formatGermanCurrency, buildDocumentSender, buildDocumentTitle, extractDokumentDatum } from '@/features/ocr-mvp/adapters/ocrMvpDocumentIdentity';

const GENERIC_TITLE_FALLBACKS = new Set([
  'Foto aufgenommen',
  'Bild ausgewählt',
  'Dokument aus Fotos',
  'Analysiertes Dokument',
  'Datei ausgewählt',
]);

const KIND_LABEL: Record<string, string> = {
  invoice:    'Rechnung',
  settlement: 'Nebenkosten',
  form:       'Formular',
  letter:     'Behördenpost',
  insurance:  'Versicherungsdokument',
  quote:      'Angebot',
};

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  dusuk:  { label: 'Niedriges Risiko', color: '#22C55E', bg: '#22C55E18' },
  orta:   { label: 'Mittleres Risiko', color: '#F59E0B', bg: '#F59E0B18' },
  yuksek: { label: 'Hohes Risiko',     color: '#FF6B6B', bg: '#FF6B6B18' },
};

type ActionHandler = 'preview' | 'download';
interface ActionCfg { label: string; icon: string; handler: ActionHandler }

const ACTION_MAP: Record<string, ActionCfg> = {
  export_excel:       { label: 'Excel für Steuerberater herunterladen', icon: 'download-outline',      handler: 'download' },
  export_share:       { label: 'Teilen',                                icon: 'share-outline',         handler: 'download' },
  show_fields:        { label: 'Felder anzeigen',                       icon: 'list-outline',          handler: 'preview'  },
  show_summary:       { label: 'Zusammenfassung anzeigen',              icon: 'document-text-outline', handler: 'preview'  },
  create_reply_draft: { label: 'Entwurf anzeigen',                      icon: 'create-outline',        handler: 'preview'  },
};

interface Props {
  summary: ActionSummaryType;
  onPreview: () => void;
  onDownload: () => void;
  isPreviewing: boolean;
  isDownloading: boolean;
  actionsSecondary?: boolean;
}

export default function OcrMvpActionSummary({
  summary, onPreview, onDownload, isPreviewing, isDownloading, actionsSecondary,
}: Props) {
  const { Colors } = useTheme();
  const st = styles(Colors);

  const kind      = summary.kind ?? 'unknown';
  const kindLabel = KIND_LABEL[kind] ?? 'Dokument';
  // Backend echoes the upload filename as title (e.g. "Scan 1780169901922") — treat as no-title.
  const rawTitle  = /^Scan[\s_]+\d/i.test(summary.title ?? '') ? null : summary.title;
  const humanized = humanizeTitle(rawTitle);
  const title = (() => {
    if (!humanized || GENERIC_TITLE_FALLBACKS.has(humanized)) {
      const sender = buildDocumentSender(kind, summary);
      if (sender !== 'Unbekannt') return sender;
      return buildDocumentTitle(kind, summary, extractDokumentDatum(summary));
    }
    return humanized;
  })();
  const riskCfg   = summary.risk_level ? RISK_CONFIG[summary.risk_level] : null;

  const handlePress = (handler: ActionHandler) => {
    if (handler === 'preview')  { onPreview();  return; }
    if (handler === 'download') { onDownload(); return; }
  };

  const hasPreviewData = (summary.fields_count ?? 0) > 0 || (summary.tables_count ?? 0) > 0;

  const previewLabel = (): string => {
    const hasFields = (summary.fields_count ?? 0) > 0;
    const hasTables = (summary.tables_count ?? 0) > 0;
    if (!hasFields && hasTables) return 'Tabellen anzeigen';
    if (hasFields  && hasTables) return 'Datenvorschau';
    return 'Felder anzeigen';
  };

  const actions = (summary.recommended_actions ?? [])
    .filter(key => {
      const c = ACTION_MAP[key];
      if (!c) return false;
      if (key === 'show_fields' && !hasPreviewData) return false;
      return true;
    })
    .slice(0, 3);

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

      {/* Form / Settlement meta — muted details line */}
      {(kind === 'form' || kind === 'settlement') && (
        summary.fields_count != null || summary.tables_count != null || summary.lines_count != null
      ) && (
        <Text style={[st.techDetails, { color: Colors.textTertiary }]}>
          {[
            summary.fields_count != null ? `${summary.fields_count} ${summary.fields_count === 1 ? 'Feld' : 'Felder'}` : null,
            summary.tables_count != null ? `${summary.tables_count} ${summary.tables_count === 1 ? 'Tabelle' : 'Tabellen'}` : null,
            summary.lines_count  != null ? `${summary.lines_count} ${summary.lines_count === 1 ? 'Zeile' : 'Zeilen'}` : null,
          ].filter(Boolean).join(' · ')}
        </Text>
      )}

      {/* Invoice meta */}
      {kind === 'invoice' && (
        <View style={st.metaRow}>
          {(summary.total_brutto ?? summary.amount) != null && (() => {
            const formatted = formatGermanCurrency(
              summary.total_brutto ?? summary.amount,
              summary.currency,
            );
            return formatted
              ? <MetaChip label={formatted} C={Colors} large />
              : null;
          })()}
          {summary.line_items_count != null && (
            <MetaChip label={`${summary.line_items_count} Positionen`} C={Colors} />
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
                Frist: {summary.deadline}
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
            const isLoading = (cfg.handler === 'preview'  && isPreviewing) ||
                              (cfg.handler === 'download' && isDownloading);
            const isPrimary = !actionsSecondary && idx === 0;
            const iconColor = isPrimary ? '#fff' : Colors.primary;

            return (
              <TouchableOpacity
                key={key}
                style={[st.btn, isPrimary ? st.btnPrimary : st.btnOutline]}
                onPress={() => !isLoading && handlePress(cfg.handler)}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                {isLoading
                  ? <ActivityIndicator size="small" color={isPrimary ? '#fff' : Colors.primary} />
                  : <Icon name={cfg.icon} size={18} color={iconColor} />
                }
                <Text style={[st.btnLabel, isPrimary ? st.btnLabelPrimary : st.btnLabelOutline]}>
                  {key === 'show_fields' ? previewLabel() : cfg.label}
                </Text>
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
  techDetails:     { fontSize: 12, lineHeight: 16 },
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
  btnLabel:        { fontSize: 15, fontWeight: '700' },
  btnLabelPrimary: { color: '#fff' },
  btnLabelOutline: { color: C.primary },
});
