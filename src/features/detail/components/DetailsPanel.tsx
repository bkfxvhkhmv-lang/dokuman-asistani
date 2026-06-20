import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import type { DetailsPanelProps } from '@/features/detail/components/details-panel/types';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';
import { FieldRow } from '@/features/detail/components/details-panel/FieldRow';
import { groupDocumentFields } from '@/features/detail/components/details-panel/groupDocumentFields';
import { DetailVisibleActionCards } from '@/features/detail/components/details-panel/DetailVisibleActionCards';
import { WeitereAktionenAccordion } from '@/features/detail/components/details-panel/WeitereAktionenAccordion';
import { WeitereAktionenContent } from '@/features/detail/components/details-panel/WeitereAktionenContent';
import type { FieldStatus } from '@/features/detail/components/details-panel/FieldRow';
import { formatBetrag } from '@/utils/formatters';
import { formatIsoToGermanDate } from '@/utils/germanInputFormat';
import { resolveDocumentSender } from '@/utils/displaySanitizer';
import { useT } from '@/hooks/useT';

export type { DetailsPanelProps } from '@/features/detail/components/details-panel/types';

export default function DetailsPanel({
  dok,
  mevcutEtiketten = [],
  extrahierteFelder = [],
  aehnlicheDoks: _aehnlicheDoks = [],
  ocrRisiken = [],
  graph: _graph,
  onOpenFullscreen,
  onEdit,
  onExport,
  onSign,
  onErledigt,
  onLoeschen,
  onNebenkostenPruefen,
  onReplyDraft,
  onShare,
  actionPlan = null,
  digitalTwin,
  suspendPreview = false,
  isUnanalysedQuickSaved = false,
}: DetailsPanelProps & { onOpenFullscreen?: () => void }) {
  void _graph;
  void _aehnlicheDoks;

  const { S, Colors: C, R } = useTheme();
  const { t: T } = useT();

  if (!dok) return null;

  const groups = useMemo(
    () => groupDocumentFields(dok, extrahierteFelder),
    [dok, extrahierteFelder],
  );
  const confidencePct = dok.confidence ?? 100;
  const displaySender = resolveDocumentSender(dok);

  const belegDatum   = dok.dokumentDatum ? formatIsoToGermanDate(dok.dokumentDatum) : null;
  const erfasstDatum = formatIsoToGermanDate(dok.datum);
  const showBeideDaten = !!(belegDatum && belegDatum !== erfasstDatum);

  const lowConfidence = (dok.confidence ?? 100) < 55;

  const wichtigsteRows: { icon: string; label: string; value: string; status?: FieldStatus; aiSparkle?: boolean }[] = [
    {
      icon: 'buildings', label: T('field.sender'), value: displaySender,
      status: isUnanalysedQuickSaved
        ? undefined
        : (!displaySender && !dok.aiSender ? 'fehlt' : (lowConfidence && !dok.aiSender ? 'pruefen' : undefined)),
    },
    ...(showBeideDaten
      ? [
          { icon: 'calendar-blank', label: T('field.document_date'),  value: belegDatum! },
          { icon: 'scan',           label: T('field.captured_at'),  value: erfasstDatum || '–' },
        ]
      : [{
          icon: 'calendar-blank', label: T('field.date'),
          value: belegDatum ?? erfasstDatum ?? '',
          status: isUnanalysedQuickSaved || dok.dokumentDatum ? undefined : ('pruefen' as FieldStatus),
        }]
    ),
    ...(dok.betrag != null || /rechnung|mahnung|bußgeld|bussgeld|zahlungsaufforderung|beitragsrechnung|gebührenbescheid/i.test(dok.aiDocumentType ?? dok.typ ?? '') ? [{
      icon: 'currency-eur', label: T('field.amount'),
      value: dok.betrag != null ? (formatBetrag(dok.betrag as number, dok.waehrung) ?? '') : '',
      status: isUnanalysedQuickSaved || dok.betrag != null
        ? undefined
        : (/rechnung|mahnung|bußgeld|bussgeld|zahlungsaufforderung|beitragsrechnung|gebührenbescheid/i.test(dok.aiDocumentType ?? dok.typ ?? '') ? ('fehlt' as FieldStatus) : undefined),
    }] : []),
    ...(dok.frist ? [{ icon: 'clock', label: T('field.deadline'), value: formatIsoToGermanDate(dok.frist) }] : []),
    ...(isUnanalysedQuickSaved ? [] : groups.wichtigste.map(f => ({ icon: f.icon, label: f.label, value: f.value, status: 'pruefen' as FieldStatus, aiSparkle: f.aiSparkle }))),
  ];

  const hasContent = !!(dok.uri || groups.wichtigste.length > 0 || groups.zahlung.length > 0 || groups.weitere.length > 0 || dok.rohText);

  const showVisibleActions = !isUnanalysedQuickSaved && actionPlan;

  return (
    <View style={{ padding: S.md, paddingBottom: 16 }} testID="details-panel">

      {/* Visible card 1: document identity / summary */}
      <SectionCard title={T('detail.section.doc_data')}>
        {wichtigsteRows.map((f, i) => (
          <FieldRow
            key={f.label}
            icon={f.icon}
            label={f.label}
            value={f.value}
            isLast={i === wichtigsteRows.length - 1}
            status={f.status}
            aiSparkle={!isUnanalysedQuickSaved && f.aiSparkle}
            showEditAffordance
            onPress={f.status && onEdit ? onEdit : undefined}
          />
        ))}
      </SectionCard>

      {/* Visible cards 2–3: primary + at most one secondary action */}
      {showVisibleActions ? (
        <DetailVisibleActionCards dok={dok} actionPlan={actionPlan} digitalTwin={digitalTwin} />
      ) : null}

      {!hasContent && (
        <View style={{
          alignItems: 'center', paddingVertical: 32, gap: 10,
          borderRadius: R.lg, borderWidth: 1, borderStyle: 'dashed',
          borderColor: C.borderLight, marginTop: S.md,
        }}>
          <Icon name="document-text" size={22} color={C.textTertiary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' }}>
            {T('details.empty_title')}
          </Text>
          <Text style={{ fontSize: 12, color: C.textTertiary, textAlign: 'center', lineHeight: 18 }}>
            {T('details.empty_body')}
          </Text>
        </View>
      )}

      {/* Accordion: secondary/destructive/technical — lazy-mounted */}
      <WeitereAktionenAccordion title={T('detail.panel.more_actions')}>
        {() => (
          <WeitereAktionenContent
            dok={dok}
            groups={groups}
            actionPlan={actionPlan}
            mevcutEtiketten={mevcutEtiketten}
            ocrRisiken={ocrRisiken}
            confidencePct={confidencePct}
            isUnanalysedQuickSaved={isUnanalysedQuickSaved}
            suspendPreview={suspendPreview}
            onOpenFullscreen={onOpenFullscreen}
            onEdit={onEdit}
            onExport={onExport}
            onSign={onSign}
            onShare={onShare}
            onErledigt={onErledigt}
            onLoeschen={onLoeschen}
            onNebenkostenPruefen={onNebenkostenPruefen}
            onReplyDraft={onReplyDraft}
          />
        )}
      </WeitereAktionenAccordion>
    </View>
  );
}
