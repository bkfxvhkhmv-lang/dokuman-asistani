import React from 'react';
import { View } from 'react-native';
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

  const { S } = useTheme();

  if (!dok) return null;

  const smartFields = buildSmartFieldRows(dok);
  const confidencePct = dok.confidence ?? 100;

  return (
    <View style={{ padding: S.md, paddingBottom: 48 }}>
      {dok.rohText ? <RohTextSection rohText={dok.rohText} /> : null}

      {dok.rohText ? <View style={{ height: S.md }} /> : null}

      <OcrConfidenceSection confidencePct={confidencePct} ocrRisiken={ocrRisiken} />

      {smartFields.length > 0 && (
        <SectionCard title="ERKANNTE FELDER (SMART)">
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

      <EtikettenSection mevcutEtiketten={mevcutEtiketten} />

      <ExtrahierteKiSection felder={extrahierteFelder} />

      <AehnlicheDocsSection dokumente={aehnlicheDoks} />

      <DocumentPreviewSection dok={dok} onOpenFullscreen={onOpenFullscreen} />
    </View>
  );
}
