import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, type ThemeColors } from '../../../ThemeContext';
import { AppButton, AppCard } from '../../../design/components';
import type { Dokument, StoreState } from '../../../store';
import type { DocumentDigitalTwinModel } from '../../../core/intelligence/DocumentDigitalTwin';
import type { SendProfile } from '../services/documentActionFlows';

// ── Action metadata ───────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; shortLabel: string; icon: string; tone: string }> = {
  zahlen:    { label: 'Jetzt bezahlen',       shortLabel: 'Bezahlen',  icon: '💶', tone: 'primary' },
  einspruch: { label: 'Einspruch vorbereiten', shortLabel: 'Einspruch', icon: '✍️', tone: 'danger' },
  kalender:  { label: 'Frist eintragen',       shortLabel: 'Kalender',  icon: '📅', tone: 'success' },
  mail:      { label: 'Als E-Mail öffnen',     shortLabel: 'E-Mail',    icon: '📧', tone: 'neutral' },
  review:    { label: 'Angaben prüfen',        shortLabel: 'Prüfen',    icon: '🧐', tone: 'warning' },
  ai:        { label: 'Dokument verstehen',    shortLabel: 'Verstehen', icon: '🧠', tone: 'neutral' },
};

function toneColors(tone: string, colors: ThemeColors) {
  if (tone === 'danger')  return { bg: colors.dangerLight,  border: colors.dangerBorder, text: colors.danger };
  if (tone === 'success') return { bg: colors.successLight, border: `${colors.success}44`, text: colors.success };
  if (tone === 'warning') return { bg: colors.warningLight, border: `${colors.warning}55`, text: colors.warningText || colors.warning };
  if (tone === 'primary') return { bg: colors.primaryLight, border: `${colors.primary}33`, text: colors.primaryDark };
  return { bg: colors.bgCard, border: colors.border, text: colors.text };
}

function normalizeNextAction(nextAction: string | null | undefined): string {
  return nextAction?.toLowerCase?.().trim?.() || '';
}

function inferPrimaryKey(dok: Dokument, digitalTwin: DocumentDigitalTwinModel | null | undefined): string {
  if (!dok || dok.erledigt) return 'ai';
  if (dok.confidence != null && dok.confidence < 55) return 'review';
  const nextAction = normalizeNextAction(digitalTwin?.intelligence?.lifecycle?.nextAction);
  if (nextAction.includes('zahl'))    return 'zahlen';
  if (nextAction.includes('einspruch')) return 'einspruch';
  if (nextAction.includes('takvim') || nextAction.includes('kalender')) return 'kalender';
  if (nextAction.includes('e-mail') || nextAction.includes('mail')) return 'mail';
  if (nextAction.includes('prüf') || nextAction.includes('review')) return 'review';
  if (dok.frist) {
    const dueInDays = Math.ceil((new Date(dok.frist).getTime() - Date.now()) / 86400000);
    if (dok.aktionen?.includes('zahlen') && dueInDays <= 3) return 'zahlen';
    if (dok.aktionen?.includes('einspruch') && dueInDays <= 14) return 'einspruch';
    if (dueInDays <= 7) return 'kalender';
  }
  return ['zahlen','einspruch','kalender','mail'].find(a => dok.aktionen?.includes(a)) || 'ai';
}

function buildPressMap(handlers: Record<string, (() => void) | undefined>) {
  return {
    zahlen: handlers.onZahlen, einspruch: handlers.onEinspruch,
    kalender: handlers.onKalender, mail: handlers.onMailTaslak,
    review: handlers.onEdit, ai: handlers.onAciklama,
    chat: handlers.onChat, formular: handlers.onFormular,
    erledigt: handlers.onErledigt, teilen: handlers.onTeilen,
    pdf: handlers.onPDF, sicher: handlers.onSicherTeilen,
    vorlage: handlers.onYanitSablon, institutionen: handlers.onKurumlar,
    hilfe: handlers.onHilfe, partner: handlers.onZahlenMitPartner,
  };
}

function getInstitutionActionHint(primaryKey: string, institutionSendProfile: SendProfile | null | undefined): string | null {
  if (!institutionSendProfile) return null;
  if (primaryKey === 'mail') return `Bevorzugter Kanal: ${institutionSendProfile.preferredChannel === 'email' ? 'E-Mail' : institutionSendProfile.preferredChannel}`;
  return null;
}

export interface ActionPlan {
  primary: { key: string; label: string; shortLabel?: string; icon: string; tone?: string; onPress?: () => void };
  secondary: Array<{ key: string; label: string; shortLabel?: string; icon: string; tone?: string; onPress?: () => void }>;
  hidden: Array<{ key: string; label: string; icon: string; onPress?: () => void }>;
}

export function getDetailActionPlan(
  dok: Dokument | undefined,
  digitalTwin: DocumentDigitalTwinModel | null | undefined,
  handlers: Record<string, () => void> = {},
  state: Partial<StoreState> = {},
): ActionPlan | null {
  if (!dok) return null;
  const partnerEnabled = !!state?.einstellungen?.partnerEmail;
  const onPress = buildPressMap(handlers) as Record<string, any>;
  const primaryKey = inferPrimaryKey(dok, digitalTwin);

  const primary = { key: primaryKey, ...ACTION_META[primaryKey], onPress: onPress[primaryKey] };

  const secondaryKeys = ([
    dok.aktionen?.includes('zahlen') && 'zahlen',
    dok.aktionen?.includes('einspruch') && 'einspruch',
    dok.frist && 'kalender',
    'mail',
  ] as (string | false)[])
    .filter((k): k is string => Boolean(k))
    .filter((k, i, arr) => arr.indexOf(k) === i)
    .filter(k => k !== primaryKey)
    .slice(0, 2);

  const secondary = secondaryKeys.map(key => ({ key, ...ACTION_META[key], onPress: onPress[key] }));

  const hidden = ([
    onPress.chat      && { key: 'chat',        label: 'Mit KI chatten',            icon: '💬', onPress: onPress.chat },
    onPress.vorlage   && { key: 'vorlage',      label: 'Antwortvorlagen',           icon: '✉️', onPress: onPress.vorlage },
    onPress.formular  && { key: 'formular',     label: 'Formular ausfüllen',        icon: '📋', onPress: onPress.formular },
    onPress.institutionen && { key: 'institutionen', label: 'Behörden & Institutionen', icon: '🏛️', onPress: onPress.institutionen },
    onPress.hilfe     && { key: 'hilfe',        label: 'Hilfe & Beratung',          icon: '🆘', onPress: onPress.hilfe },
    onPress.teilen    && { key: 'teilen',       label: 'Teilen',                    icon: '📤', onPress: onPress.teilen },
    onPress.pdf       && { key: 'pdf',          label: 'PDF exportieren',           icon: '📄', onPress: onPress.pdf },
    partnerEnabled && onPress.partner && { key: 'partner', label: 'Partner informieren', icon: '🤝', onPress: onPress.partner },
    onPress.sicher    && { key: 'sicher',       label: 'Sicher teilen',             icon: '🔗', onPress: onPress.sicher },
    onPress.review && primaryKey !== 'review' && { key: 'review', label: 'Dokument bearbeiten', icon: '📝', onPress: onPress.review },
    onPress.ai && primaryKey !== 'ai'     && { key: 'ai',     label: 'Dokument verstehen',  icon: '🧠', onPress: onPress.ai },
    onPress.erledigt  && { key: 'erledigt', label: dok.erledigt ? 'Als offen markieren' : 'Als erledigt markieren', icon: dok.erledigt ? '↩️' : '✅', onPress: onPress.erledigt },
  ] as (false | { key: string; label: string; icon: string; onPress?: () => void })[]).filter((x): x is { key: string; label: string; icon: string; onPress?: () => void } => Boolean(x));

  return { primary, secondary, hidden };
}

// ── ActionsPanel component ────────────────────────────────────────────────────

interface ActionsPanelProps {
  dok: Dokument;
  digitalTwin?: DocumentDigitalTwinModel | null;
  actionPlan: ActionPlan | null;
  onOpenMore: () => void;
  onBack: () => void;
  institutionSendProfile?: SendProfile | null;
}

export default function ActionsPanel({ dok, digitalTwin, actionPlan, onOpenMore, onBack, institutionSendProfile }: ActionsPanelProps) {
  const { Colors: C, S, R } = useTheme();
  if (!dok || !actionPlan) return null;

  const { primary, secondary, hidden } = actionPlan;
  const institutionHint = getInstitutionActionHint(primary.key, institutionSendProfile);
  const processTone = primary.key === 'review' ? 'warning'
    : primary.key === 'einspruch' ? 'danger'
    : primary.key === 'kalender'  ? 'success'
    : primary.key === 'zahlen'    ? 'primary' : 'neutral';
  const processColors = toneColors(processTone, C);

  return (
    <View style={{ paddingHorizontal: S.md, paddingTop: S.md, paddingBottom: 132 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
        <AppButton label="Zur Übersicht" variant="secondary" onPress={onBack} style={{ minWidth: 150 }} />
      </View>
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 10 }}>NÄCHSTER SCHRITT</Text>
      <TouchableOpacity onPress={primary.onPress} disabled={!primary.onPress} activeOpacity={primary.onPress ? 0.8 : 1}>
        <AppCard style={{ marginBottom: 12 }} padding={S.md} radius={R.lg} borderColor={processColors.border} backgroundColor={processColors.bg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 20 }}>{digitalTwin?.intelligence?.lifecycle?.phaseIcon || primary.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: processColors.text }}>
                {digitalTwin?.intelligence?.lifecycle?.phaseLabel || 'Aktion empfohlen'}
              </Text>
              <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                {primary.key === 'review' ? 'Die wichtigsten Felder sollten zuerst kurz geprüft werden.'
                  : digitalTwin?.statusSummary || 'BriefPilot zeigt den sinnvollsten nächsten Schritt.'}
              </Text>
              {!!institutionHint && <Text style={{ fontSize: 10, color: processColors.text, marginTop: 6, fontWeight: '600' }}>{institutionHint}</Text>}
            </View>
            {primary.onPress && <Text style={{ fontSize: 16, color: processColors.text }}>›</Text>}
          </View>
        </AppCard>
      </TouchableOpacity>

      {secondary.length > 0 && (
        <>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 10 }}>SCHNELLE AKTIONEN</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {secondary.map(action => {
              const tone = toneColors(action.tone ?? 'neutral', C);
              return (
                <TouchableOpacity key={action.key}
                  style={{ flex: 1, borderRadius: R.lg, paddingVertical: 12, paddingHorizontal: 10,
                    alignItems: 'center', borderWidth: 1.2, borderColor: tone.border, backgroundColor: C.bgCard }}
                  onPress={action.onPress}>
                  <Text style={{ fontSize: 16, marginBottom: 4 }}>{action.icon}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: tone.text }}>{action.shortLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <TouchableOpacity onPress={onOpenMore}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: R.lg, paddingHorizontal: S.md, paddingVertical: 14,
          borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bgCard }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 16 }}>⋯</Text>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>Mehr</Text>
            <Text style={{ fontSize: 11, color: C.textSecondary }}>{hidden.length} weitere Aktionen und Werkzeuge</Text>
          </View>
        </View>
        <Text style={{ fontSize: 18, color: C.textTertiary }}>›</Text>
      </TouchableOpacity>
    </View>
  );
}
