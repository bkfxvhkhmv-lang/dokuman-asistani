import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import type { DetailsPanelProps } from '@/features/detail/components/details-panel/types';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';
import { FieldRow } from '@/features/detail/components/details-panel/FieldRow';
import { groupDocumentFields } from '@/features/detail/components/details-panel/groupDocumentFields';
import { OcrConfidenceSection } from '@/features/detail/components/details-panel/OcrConfidenceSection';
import { DocumentPreviewSection } from '@/features/detail/components/details-panel/DocumentPreviewSection';
import { EtikettenSection } from '@/features/detail/components/details-panel/EtikettenSection';
import { BesserErkennenCard } from '@/features/detail/components/details-panel/BesserErkennenCard';
import { RohTextSection } from '@/features/detail/components/details-panel/RohTextSection';
import type { FieldStatus } from '@/features/detail/components/details-panel/FieldRow';
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

  const [weitereSichtbar, setWeitereSichtbar] = useState(false);

  if (!dok) return null;

  const groups = groupDocumentFields(dok, extrahierteFelder);
  const confidencePct = dok.confidence ?? 100;

  const belegDatum   = dok.dokumentDatum ? formatDatum(dok.dokumentDatum) : null;
  const erfasstDatum = formatDatum(dok.datum);
  const showBeideDaten = !!(belegDatum && belegDatum !== erfasstDatum);

  const lowConfidence = (dok.confidence ?? 100) < 55;

  const wichtigsteRows: { icon: string; label: string; value: string; status?: FieldStatus; aiSparkle?: boolean }[] = [
    {
      icon: 'buildings', label: T('field.sender'), value: dok.absender || '',
      status: !dok.absender ? 'fehlt' : (lowConfidence ? 'pruefen' : undefined),
    },
    ...(showBeideDaten
      ? [
          { icon: 'calendar-blank', label: 'Belegdatum',  value: belegDatum! },
          { icon: 'scan',           label: 'Erfasst am',  value: erfasstDatum || '–' },
        ]
      : [{
          icon: 'calendar-blank', label: T('field.date'),
          value: belegDatum ?? erfasstDatum ?? '',
          status: !dok.dokumentDatum ? 'pruefen' as FieldStatus : undefined,
        }]
    ),
    // Betrag always shown — 'fehlt' if missing
    {
      icon: 'currency-eur', label: T('field.amount'),
      value: dok.betrag != null ? (formatBetrag(dok.betrag as number, dok.waehrung) ?? '') : '',
      status: dok.betrag == null ? 'fehlt' : undefined,
    },
    ...(dok.frist ? [{ icon: 'clock', label: T('field.deadline'), value: formatFrist(dok.frist) }] : []),
    // AI-inferred reference fields — always mark for review
    ...groups.wichtigste.map(f => ({ icon: f.icon, label: f.label, value: f.value, status: 'pruefen' as FieldStatus, aiSparkle: f.aiSparkle })),
  ];

  const hasContent = !!(dok.uri || groups.wichtigste.length > 0 || groups.zahlung.length > 0 || groups.weitere.length > 0 || dok.rohText);

  return (
    <View style={{ padding: S.md, paddingBottom: 16 }}>

      {/* ── 1. Seiten-Vorschau ────────────────────────────────────────────── */}
      <DocumentPreviewSection dok={dok} onOpenFullscreen={onOpenFullscreen} />

      {/* ── 2. Dokumentdaten ─────────────────────────────────────────────── */}
      <SectionCard title="Dokumentdaten">
        {wichtigsteRows.map((f, i) => (
          <FieldRow
            key={f.label}
            icon={f.icon}
            label={f.label}
            value={f.value}
            isLast={i === wichtigsteRows.length - 1}
            status={f.status}
            aiSparkle={f.aiSparkle}
            showEditAffordance
            onPress={f.status && onEdit ? onEdit : undefined}
          />
        ))}
      </SectionCard>

      {/* ── 3. KI-Erkennung (manual enrichment, shown only for weak docs) ── */}
      <BesserErkennenCard dok={dok} />

      {/* ── 4. Zahlungsinformationen ──────────────────────────────────────── */}
      {groups.zahlung.length > 0 && (
        <SectionCard title="Zahlungsinformationen">
          {groups.zahlung.map((f, i) => (
            <FieldRow
              key={f.key}
              icon={f.icon}
              label={f.label}
              value={f.value}
              aiSparkle={f.aiSparkle}
              status={f.aiSparkle ? 'pruefen' : undefined}
              isLast={i === groups.zahlung.length - 1}
            />
          ))}
        </SectionCard>
      )}

      {/* ── 4. Kontakt ───────────────────────────────────────────────────── */}
      {groups.kontakt.length > 0 && (
        <SectionCard title="Kontakt">
          {groups.kontakt.map((f, i) => (
            <FieldRow
              key={f.key}
              icon={f.icon}
              label={f.label}
              value={f.value}
              aiSparkle={f.aiSparkle}
              isLast={i === groups.kontakt.length - 1}
            />
          ))}
        </SectionCard>
      )}

      {/* ── 4b. Vertragsdetails ───────────────────────────────────────────── */}
      {groups.vertrag.length > 0 && (
        <SectionCard title="Vertragsdetails">
          {groups.vertrag.map((f, i) => (
            <FieldRow
              key={f.key}
              icon={f.icon}
              label={f.label}
              value={f.value}
              aiSparkle={f.aiSparkle}
              isLast={i === groups.vertrag.length - 1}
            />
          ))}
        </SectionCard>
      )}

      {/* ── 5. Weitere Angaben (collapsed) ───────────────────────────────── */}
      {groups.weitere.length > 0 && (
        <View style={{ marginBottom: S.md, borderRadius: R.lg, backgroundColor: C.bgCard,
          borderWidth: 0.5, borderColor: C.border }}>
          <TouchableOpacity
            onPress={() => setWeitereSichtbar(v => !v)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: S.lg, paddingBottom: weitereSichtbar ? S.sm : S.lg }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.textSecondary }}>
              Weitere Angaben
            </Text>
            <Icon name={weitereSichtbar ? 'caret-up' : 'caret-down'} size={14} color={C.textTertiary} />
          </TouchableOpacity>
          {weitereSichtbar && (
            <View style={{ paddingHorizontal: S.lg, paddingBottom: S.lg }}>
              {groups.weitere.map((f, i) => (
                <FieldRow
                  key={f.key}
                  icon={f.icon}
                  label={f.label}
                  value={f.value}
                  aiSparkle={f.aiSparkle}
                  isLast={i === groups.weitere.length - 1}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── 6. OCR-Qualitätshinweis ──────────────────────────────────────── */}
      <OcrConfidenceSection dok={dok} confidencePct={confidencePct} ocrRisiken={ocrRisiken} />

      {/* ── 7. Etiketten ─────────────────────────────────────────────────── */}
      <EtikettenSection mevcutEtiketten={mevcutEtiketten} />

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
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
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
          style={{ alignItems: 'center', marginTop: 18, paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 13, color: C.danger }}>Dokument löschen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
