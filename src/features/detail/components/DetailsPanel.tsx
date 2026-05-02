import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
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
  onEdit,
  onExport,
  onLoeschen,
}: DetailsPanelProps & { onOpenFullscreen?: () => void }) {
  void _graph;

  const { S, Colors: C, R } = useTheme();
  const { t: T } = useT();

  if (!dok) return null;

  const smartFields = buildSmartFieldRows(dok);
  const confidencePct = dok.confidence ?? 100;

  const coreRows: { icon: string; label: string; value: string }[] = [
    { icon: 'tag',           label: T('field.category'), value: dok.typ || '–' },
    { icon: 'buildings',     label: T('field.sender'),   value: dok.absender || '–' },
    { icon: 'calendar-blank',label: T('field.date'),     value: formatDatum(dok.datum) || '–' },
    ...(dok.betrag != null ? [{ icon: 'currency-eur',    label: T('field.amount'),   value: formatBetrag(dok.betrag as number) ?? '–' }] : []),
    ...(dok.frist  ? [{ icon: 'clock',                   label: T('field.deadline'), value: formatFrist(dok.frist) }] : []),
    ...(dok.risiko ? [{ icon: 'warning-circle',          label: T('field.priority'), value: dok.risiko === 'hoch' ? T('doc.urgent_label') : dok.risiko === 'mittel' ? T('doc.this_week') : T('doc.no_action') }] : []),
  ];

  const hasContent = !!(dok.uri || smartFields.length > 0 || extrahierteFelder.length > 0 || dok.rohText);

  return (
    <View style={{ padding: S.md, paddingBottom: 16 }}>

      {/* ── 1. Seiten-Vorschau ────────────────────────────────────────────── */}
      <DocumentPreviewSection dok={dok} onOpenFullscreen={onOpenFullscreen} />

      {/* ── 2. Kernfelder ────────────────────────────────────────────────── */}
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

      {/* ── 3. KI-extrahierte Felder (IBAN, Aktenzeichen …) ─────────────── */}
      {smartFields.length > 0 && (
        <SectionCard title={T('detail.section.fields')}>
          {smartFields.map((f, i) => (
            <FieldRow
              key={f.label}
              icon={f.icon}
              label={f.label}
              value={f.value}
              aiSparkle={f.aiSparkle}
              isLast={i === smartFields.length - 1}
            />
          ))}
        </SectionCard>
      )}

      {/* ── 4. OCR-Qualitätshinweis ──────────────────────────────────────── */}
      <OcrConfidenceSection confidencePct={confidencePct} ocrRisiken={ocrRisiken} />

      {/* ── 5. Etiketten ─────────────────────────────────────────────────── */}
      <EtikettenSection mevcutEtiketten={mevcutEtiketten} />

      {/* ── 6. KI-Felder (extended) ──────────────────────────────────────── */}
      <ExtrahierteKiSection felder={extrahierteFelder} />

      {/* ── 7. Ähnliche Dokumente ────────────────────────────────────────── */}
      <AehnlicheDocsSection dokumente={aehnlicheDoks} />

      {/* ── 8. Originaltext — eingeklappt, nur wenn vorhanden ────────────── */}
      {dok.rohText ? (
        <>
          <View style={{ height: S.md }} />
          <RohTextSection rohText={dok.rohText} />
        </>
      ) : null}

      {/* ── Fallback: noch keine Felder erkannt ──────────────────────────── */}
      {!hasContent && (
        <View style={{
          alignItems: 'center', paddingVertical: 32, gap: 10,
          borderRadius: R.lg, borderWidth: 1, borderStyle: 'dashed',
          borderColor: C.borderLight, marginTop: S.md,
        }}>
          <Icon name="document-text" size={22} color={C.textTertiary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, textAlign: 'center' }}>
            Noch nicht alle Felder erkannt.
          </Text>
          <Text style={{ fontSize: 12, color: C.textTertiary, textAlign: 'center', lineHeight: 18 }}>
            Du kannst die wichtigsten Angaben{'\n'}manuell prüfen oder bearbeiten.
          </Text>
          {onEdit && (
            <TouchableOpacity
              onPress={onEdit}
              style={{ marginTop: 4, paddingHorizontal: 20, paddingVertical: 9,
                borderRadius: 999, borderWidth: 1, borderColor: C.primary, backgroundColor: C.primaryLight }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.primaryDark }}>Felder bearbeiten</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Aktionsleiste: Bearbeiten | Exportieren ───────────────────────── */}
      {(onEdit || onExport) && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: S.lg ?? S.md + 4 }}>
          {onEdit && (
            <TouchableOpacity
              onPress={onEdit}
              style={{ flex: 1, borderRadius: R.md ?? R.lg, paddingVertical: 13,
                alignItems: 'center', backgroundColor: C.primary }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Bearbeiten</Text>
            </TouchableOpacity>
          )}
          {onExport && (
            <TouchableOpacity
              onPress={onExport}
              style={{ flex: 1, borderRadius: R.md ?? R.lg, paddingVertical: 13,
                alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>Exportieren</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Löschen — destruktiv, bewusst klein ──────────────────────────── */}
      {onLoeschen && (
        <TouchableOpacity
          onPress={onLoeschen}
          style={{ alignItems: 'center', marginTop: 22, paddingVertical: 6 }}
        >
          <Text style={{ fontSize: 13, color: C.danger }}>Dokument löschen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
