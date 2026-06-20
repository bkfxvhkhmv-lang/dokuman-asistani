import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';
import type { DetailsPanelProps } from '@/features/detail/components/details-panel/types';
import { SectionCard } from '@/features/detail/components/details-panel/SectionCard';
import { FieldRow } from '@/features/detail/components/details-panel/FieldRow';
import { OcrConfidenceSection } from '@/features/detail/components/details-panel/OcrConfidenceSection';
import { DocumentPreviewSection } from '@/features/detail/components/details-panel/DocumentPreviewSection';
import { EtikettenSection } from '@/features/detail/components/details-panel/EtikettenSection';
import { BesserErkennenCard } from '@/features/detail/components/details-panel/BesserErkennenCard';
import { RohTextSection } from '@/features/detail/components/details-panel/RohTextSection';
import { NkSummaryCard } from '@/features/detail/components/NkSummaryCard';
import { ReplyDraftCard } from '@/features/detail/components/ReplyDraftCard';
import type { GroupedDocFields } from '@/features/detail/components/details-panel/groupDocumentFields';
import { useT } from '@/hooks/useT';

interface ActionRowProps {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  isLast?: boolean;
}

function ActionRow({ icon, label, onPress, destructive = false, isLast = false }: ActionRowProps) {
  const { Colors: C, S } = useTheme();
  const iconColor = destructive ? C.danger : C.textSecondary;
  const textColor = destructive ? C.danger : C.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        paddingHorizontal: S.sm,
        borderBottomWidth: isLast ? 0 : 0.45,
        borderBottomColor: C.border,
        backgroundColor: destructive ? `${C.danger}0D` : undefined,
      }}
    >
      <Icon name={icon} size={18} color={iconColor} />
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: textColor }}>{label}</Text>
      {!destructive && <Icon name="caret-right" size={14} color={C.border} />}
    </TouchableOpacity>
  );
}

export interface WeitereAktionenContentProps {
  dok: NonNullable<DetailsPanelProps['dok']>;
  groups: GroupedDocFields;
  actionPlan?: ActionPlan | null;
  mevcutEtiketten: string[];
  ocrRisiken: DetailsPanelProps['ocrRisiken'];
  confidencePct: number;
  isUnanalysedQuickSaved: boolean;
  suspendPreview: boolean;
  onOpenFullscreen?: () => void;
  onEdit?: () => void;
  onExport?: () => void;
  onSign?: () => void;
  onShare?: () => void;
  onErledigt?: () => void;
  onLoeschen?: () => void;
  onNebenkostenPruefen?: () => void;
  onReplyDraft?: () => void;
}

export function WeitereAktionenContent({
  dok,
  groups,
  actionPlan,
  mevcutEtiketten,
  ocrRisiken = [],
  confidencePct,
  isUnanalysedQuickSaved,
  suspendPreview,
  onOpenFullscreen,
  onEdit,
  onExport,
  onSign,
  onShare,
  onErledigt,
  onLoeschen,
  onNebenkostenPruefen,
  onReplyDraft,
}: WeitereAktionenContentProps) {
  const { Colors: C, S, R } = useTheme();
  const { t: T } = useT();
  const [weitereFelderOpen, setWeitereFelderOpen] = useState(false);

  const extraSecondaryActions = (actionPlan?.secondary ?? []).slice(1).filter(a => a.onPress);

  type MenuItem = { key: string; icon: string; label: string; onPress: () => void; destructive?: boolean };
  const menuItems: MenuItem[] = [
    onEdit && { key: 'edit', icon: 'pencil-simple', label: T('common.edit'), onPress: onEdit },
    onExport && { key: 'export', icon: 'upload', label: T('export.sheet.title'), onPress: onExport },
    onSign && { key: 'sign', icon: 'pen-nib', label: T('detail.more.sign_pdf'), onPress: onSign },
    onShare && { key: 'share', icon: 'share-network', label: T('common.share'), onPress: onShare },
    onErledigt && { key: 'done', icon: 'check-circle', label: T('detail.action.mark_done'), onPress: onErledigt },
      key: `sec-${a.key}`,
      icon: a.icon,
      label: T(a.labelKey),
      onPress: a.onPress!,
    })),
    onErledigt && { key: 'done', icon: 'check-circle', label: T('detail.action.mark_done'), onPress: onErledigt },
    onLoeschen && { key: 'delete', icon: 'trash', label: T('detail.delete_document'), onPress: onLoeschen, destructive: true },
  ].filter(Boolean) as MenuItem[];

  return (
    <View>
      {menuItems.length > 0 && (
        <View style={{
          borderRadius: R.md,
          borderWidth: 0.5,
          borderColor: C.border,
          backgroundColor: C.bg,
          overflow: 'hidden',
          marginBottom: S.md,
        }}>
          {menuItems.map((item, i) => (
            <ActionRow
              key={item.key}
              icon={item.icon}
              label={item.label}
              onPress={item.onPress}
              destructive={item.destructive}
              isLast={i === menuItems.length - 1}
            />
          ))}
        </View>
      )}

      {!suspendPreview && dok.uri ? (
        <DocumentPreviewSection dok={dok} onOpenFullscreen={onOpenFullscreen} />
      ) : null}

      <BesserErkennenCard dok={dok} />

      {groups.zahlung.length > 0 && (
        <SectionCard title={T('detail.section.payment_info')}>
          {groups.zahlung.map((f, i) => (
            <FieldRow
              key={f.key}
              icon={f.icon}
              label={f.label}
              value={f.value}
              aiSparkle={!isUnanalysedQuickSaved && f.aiSparkle}
              status={!isUnanalysedQuickSaved && f.aiSparkle ? 'pruefen' : undefined}
              isLast={i === groups.zahlung.length - 1}
            />
          ))}
        </SectionCard>
      )}

      {groups.kontakt.length > 0 && (
        <SectionCard title={T('detail.section.contact')}>
          {groups.kontakt.map((f, i) => (
            <FieldRow
              key={f.key}
              icon={f.icon}
              label={f.label}
              value={f.value}
              aiSparkle={!isUnanalysedQuickSaved && f.aiSparkle}
              isLast={i === groups.kontakt.length - 1}
            />
          ))}
        </SectionCard>
      )}

      {groups.vertrag.length > 0 && (
        <SectionCard title={T('detail.section.contract_details')}>
          {groups.vertrag.map((f, i) => (
            <FieldRow
              key={f.key}
              icon={f.icon}
              label={f.label}
              value={f.value}
              aiSparkle={!isUnanalysedQuickSaved && f.aiSparkle}
              isLast={i === groups.vertrag.length - 1}
            />
          ))}
        </SectionCard>
      )}

      {groups.weitere.length > 0 && (
        <View style={{ marginBottom: S.md, borderRadius: R.lg, backgroundColor: C.bgCard,
          borderWidth: 0.5, borderColor: C.border }}>
          <TouchableOpacity
            onPress={() => setWeitereFelderOpen(v => !v)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              padding: S.md, paddingBottom: weitereFelderOpen ? S.sm : S.md }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.textSecondary }}>
              {T('detail.section.more_info')}
            </Text>
            <Icon name={weitereFelderOpen ? 'caret-up' : 'caret-down'} size={14} color={C.textTertiary} />
          </TouchableOpacity>
          {weitereFelderOpen ? (
            <View style={{ paddingHorizontal: S.md, paddingBottom: S.md }}>
              {groups.weitere.map((f, i) => (
                <FieldRow
                  key={f.key}
                  icon={f.icon}
                  label={f.label}
                  value={f.value}
                  aiSparkle={!isUnanalysedQuickSaved && f.aiSparkle}
                  isLast={i === groups.weitere.length - 1}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}

      <OcrConfidenceSection dok={dok} confidencePct={confidencePct} ocrRisiken={ocrRisiken ?? []} />
      <EtikettenSection mevcutEtiketten={mevcutEtiketten} />

      {dok.rohText ? (
        <>
          <View style={{ height: S.sm }} />
          <RohTextSection rohText={dok.rohText} />
        </>
      ) : null}

      {onNebenkostenPruefen && dok ? (
        <NkSummaryCard dok={dok} onPress={onNebenkostenPruefen} />
      ) : null}

      {onReplyDraft ? (
        <ReplyDraftCard onPress={onReplyDraft} />
      ) : null}
    </View>
  );
}
