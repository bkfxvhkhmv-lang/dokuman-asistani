import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/ThemeContext';
import type { DetailsPanelProps } from '@/features/detail/components/details-panel/types';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';
import { FieldRow } from '@/features/detail/components/details-panel/FieldRow';
import { buildSmartFieldRows } from '@/features/detail/components/details-panel/buildSmartFieldRows';
import { OcrConfidenceSection } from '@/features/detail/components/details-panel/OcrConfidenceSection';
import { DocumentPreviewSection } from '@/features/detail/components/details-panel/DocumentPreviewSection';
import { EtikettenSection } from '@/features/detail/components/details-panel/EtikettenSection';
import { ExtrahierteKiSection } from '@/features/detail/components/details-panel/ExtrahierteKiSection';
import { AehnlicheDocsSection } from '@/features/detail/components/details-panel/AehnlicheDocsSection';
import { RohTextSection } from '@/features/detail/components/details-panel/RohTextSection';
import { formatBetrag, formatFrist, formatDatum } from '@/utils/formatters';
import { useT } from '@/hooks/useT';

export type { DetailsPanelProps } from '@/features/detail/components/details-panel/types';

export default function DetailsPanel({
  dok,
  mevcutEtiketten = [],
  extrahierteFelder = [],
  aehnlicheDoks = [],
  ocrRisiken = [],
  graph: _graph,
  onOpenFullscreen,
}: DetailsPanelProps & { onOpenFullscreen?: () => void }) {
  void _graph;

  const { S, Colors: C, R, Shadow } = useTheme();
  const { t: T } = useT();

  if (!dok) return null;

  const smartFields = buildSmartFieldRows(dok);
  const confidencePct = dok.confidence ?? 100;

  const coreRows: { icon: string; label: string; value: string }[] = [
    { icon: '🏷️', label: T('field.category'), value: dok.typ || '–' },
    { icon: '🏢', label: T('field.sender'),   value: dok.absender || '–' },
    { icon: '📅', label: T('field.date'),     value: formatDatum(dok.datum) || '–' },
    ...(dok.betrag != null ? [{ icon: '💶', label: T('field.amount'),   value: formatBetrag(dok.betrag as number) ?? '–' }] : []),
    ...(dok.frist  ? [{ icon: '⏰', label: T('field.deadline'), value: formatFrist(dok.frist) }] : []),
    ...(dok.risiko ? [{ icon: '🚦', label: T('field.priority'), value: dok.risiko === 'hoch' ? T('doc.urgent_label') : dok.risiko === 'mittel' ? T('doc.this_week') : T('doc.no_action') }] : []),
  ];

  return (
    <View style={{ padding: S.md, paddingBottom: 48 }}>

      <DocumentPreviewSection dok={dok} onOpenFullscreen={onOpenFullscreen} />

      <SectionCard title={T('detail.section.doc_data')}>
        {coreRows.map((f, i) => (
          <FieldRow
            key={f.label}
            icon={f.icon}
            label={f.label}
            value={f.value}
            isLast={i === coreRows.length - 1}
          />
        ))}
      </SectionCard>

      {/* Smart extracted fields (IBAN, Aktenzeichen etc.) */}
      {smartFields.length > 0 && (
        <SectionCard title={T('detail.section.fields')}>
          {smartFields.map((f, i) => (
            <FieldRow
              key={f.label}
              icon={f.icon}
              label={f.label}
              value={f.value}
              isLast={i === smartFields.length - 1}
            />
          ))}
        </SectionCard>
      )}

      {/* OCR quality warning — only when relevant */}
      <OcrConfidenceSection confidencePct={confidencePct} ocrRisiken={ocrRisiken} />

      <EtikettenSection mevcutEtiketten={mevcutEtiketten} />
      <ExtrahierteKiSection felder={extrahierteFelder} />
      <AehnlicheDocsSection dokumente={aehnlicheDoks} />

      {/* Raw OCR text — collapsible */}
      {dok.rohText ? (
        <>
          <View style={{ height: S.md }} />
          <RohTextSection rohText={dok.rohText} />
        </>
      ) : null}

      {/* Fallback when absolutely nothing else rendered */}
      {!dok.uri && smartFields.length === 0 && extrahierteFelder.length === 0 && !dok.rohText && (
        <View style={{
          alignItems: 'center', paddingVertical: 32, gap: 8,
          borderRadius: R.lg, borderWidth: 1, borderStyle: 'dashed',
          borderColor: C.borderLight, marginTop: S.md,
        }}>
          <Text style={{ fontSize: 20 }}>📄</Text>
          <Text style={{ fontSize: 13, color: C.textTertiary, textAlign: 'center' }}>
            Keine weiteren Details extrahiert.{'\n'}Scanne das Dokument erneut für mehr Infos.
          </Text>
        </View>
      )}
    </View>
  );
}
