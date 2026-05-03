import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import { AppButton, AppCard } from '@/design/components';
import Icon from '@/components/Icon';
import type { Dokument, StoreState } from '@/store';
import type { DocumentDigitalTwinModel } from '@/core/intelligence/DocumentDigitalTwin';
import { shouldShowDetailDeadlineBanner } from '@/features/detail/components/DetailDeadlineBanner';
import { getTageVerbleibend } from '@/utils/formatters';
import { getPrimaryAction, NO_LEGAL_ADVICE_DISCLAIMER } from '@/features/detail/constants/actionMapping';
import { resolveDocumentType } from '@/features/detail/constants/documentTypeUi';

// ── Action metadata ───────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; shortLabel: string; icon: string; tone: string }> = {
  zahlen:    { label: 'Zahlung vorbereiten',      shortLabel: 'Bezahlen',  icon: 'currency-eur',    tone: 'primary' },
  einspruch: { label: 'Einspruch vorbereiten',    shortLabel: 'Einspruch', icon: 'pencil-line',     tone: 'danger' },
  kalender:  { label: 'Frist eintragen',          shortLabel: 'Kalender',  icon: 'calendar-blank',  tone: 'success' },
  mail:      { label: 'Als E-Mail öffnen',        shortLabel: 'E-Mail',    icon: 'envelope-simple', tone: 'neutral' },
  review:    { label: 'Angaben prüfen',           shortLabel: 'Prüfen',    icon: 'magnifying-glass', tone: 'warning' },
  ai:        { label: 'Dokument verstehen',       shortLabel: 'Verstehen', icon: 'sparkle',         tone: 'neutral' },
  erledigt:  { label: 'Als erledigt markieren',   shortLabel: 'Erledigt',  icon: 'check-circle',    tone: 'success' },
};

const ACTION_HINT: Partial<Record<string, string>> = {
  ai:       'KI erklärt oder fasst zusammen — du wählst die Sprache.',
  zahlen:   'Überweisungsdaten oder Banking vorbereiten.',
  kalender: 'Frist mit Erinnerung im Kalender sichern.',
  mail:     'Entwurf oder Antwort per E-Mail öffnen.',
  einspruch: 'Mustertext und Fristen für Widerspruch prüfen.',
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

/** Priorisiert Bezahlen/Einspruch bei Überfälligkeit; kein Kalender-FAB, wenn der Hinweisstreifen „Frist ins Kalender“ zeigt. */
function inferPrimaryKey(dok: Dokument, digitalTwin: DocumentDigitalTwinModel | null | undefined): string {
  if (!dok || dok.erledigt) return 'ai';
  if (dok.confidence != null && dok.confidence < 55) return 'review';

  const tage = dok.frist ? getTageVerbleibend(dok.frist) : null;
  const overdue = tage !== null && tage < 0;
  const bannerKalender = shouldShowDetailDeadlineBanner(dok);

  const nextTwin = normalizeNextAction(digitalTwin?.intelligence?.lifecycle?.nextAction);

  if (overdue) {
    if (nextTwin.includes('zahl')) return 'zahlen';
    if (nextTwin.includes('einspruch')) return 'einspruch';
    if (dok.aktionen?.includes('zahlen')) return 'zahlen';
    if (dok.aktionen?.includes('einspruch')) return 'einspruch';
    if (nextTwin.includes('mail') || nextTwin.includes('e-mail')) return 'mail';
    return 'ai';
  }

  if (nextTwin.includes('zahl')) return 'zahlen';
  if (nextTwin.includes('einspruch')) return 'einspruch';
  if (nextTwin.includes('takvim') || nextTwin.includes('kalender')) {
    if (!bannerKalender) return 'kalender';
    if (dok.aktionen?.includes('zahlen')) return 'zahlen';
    if (dok.aktionen?.includes('einspruch')) return 'einspruch';
    return 'mail';
  }
  if (nextTwin.includes('e-mail') || nextTwin.includes('mail')) return 'mail';
  if (nextTwin.includes('prüf') || nextTwin.includes('review')) return 'review';

  if (dok.frist) {
    const dueInDays = Math.ceil((new Date(dok.frist).getTime() - Date.now()) / 86400000);
    if (dok.aktionen?.includes('zahlen') && dueInDays <= 3) return 'zahlen';
    if (dok.aktionen?.includes('einspruch') && dueInDays <= 14) return 'einspruch';
    if (dueInDays <= 7) {
      if (bannerKalender) {
        if (dok.aktionen?.includes('zahlen')) return 'zahlen';
        if (dok.aktionen?.includes('einspruch')) return 'einspruch';
        return 'mail';
      }
      return 'kalender';
    }
  }

  // Use type-based primary action as fallback before generic 'ai'
  const typeAction = getPrimaryAction(dok.typ);
  const typeKey = typeAction.id === 'prepare_payment'   ? 'zahlen'
                : typeAction.id === 'check_objection'   ? 'einspruch'
                : typeAction.id === 'add_to_calendar'   ? 'kalender'
                : typeAction.id === 'review_summary'    ? 'ai'
                : null;
  const fallbackWithType = typeKey && dok.aktionen?.includes(typeKey)
    ? typeKey
    : (['zahlen', 'einspruch', 'kalender', 'mail'] as string[]).find(a => dok.aktionen?.includes(a)) || 'ai';

  if (fallbackWithType === 'kalender' && bannerKalender) {
    if (dok.aktionen?.includes('zahlen')) return 'zahlen';
    if (dok.aktionen?.includes('einspruch')) return 'einspruch';
    return 'mail';
  }
  return fallbackWithType;
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

  const coreLimit = !dok.erledigt ? 1 : 2;
  const coreSecondaryKeys = ([
    dok.aktionen?.includes('zahlen') && 'zahlen',
    dok.aktionen?.includes('einspruch') && 'einspruch',
    dok.frist && 'kalender',
    'mail',
  ] as (string | false)[])
    .filter((k): k is string => Boolean(k))
    .filter((k, i, arr) => arr.indexOf(k) === i)
    .filter(k => k !== primaryKey)
    .slice(0, coreLimit);

  const secondaryKeys = !dok.erledigt
    ? [...coreSecondaryKeys, 'erledigt']
    : coreSecondaryKeys;

  const secondary = secondaryKeys
    .map(key => ({ key, ...ACTION_META[key], onPress: onPress[key] }))
    .filter(a => !!a.onPress);

  const hidden = [] as ActionPlan['hidden'];

  return { primary, secondary, hidden };
}

// ── ActionsPanel component ────────────────────────────────────────────────────

interface ActionsPanelProps {
  dok: Dokument;
  digitalTwin?: DocumentDigitalTwinModel | null;
  actionPlan: ActionPlan | null;
  onOpenMore: () => void;
  onBack: () => void;
  /** Anzahl zusätzlicher Aktionen seit „Mehr“-Überarbeitung (getrennt vom leeren legacy hidden[]) */
  moreMenuCount?: number;
}

export default function ActionsPanel({ dok, digitalTwin, actionPlan, onOpenMore, onBack, moreMenuCount = 0 }: ActionsPanelProps) {
  const { Colors: C, S, R } = useTheme();
  if (!dok || !actionPlan) return null;

  const { primary, secondary, hidden } = actionPlan;
  const extras = moreMenuCount > 0 ? moreMenuCount : hidden.length;

  const processTone = primary.key === 'review' ? 'warning'
    : primary.key === 'einspruch' ? 'danger'
    : primary.key === 'kalender'  ? 'success'
    : primary.key === 'zahlen'    ? 'primary' : 'neutral';
  const processColors = toneColors(processTone, C);

  return (
    <View style={{ paddingHorizontal: S.md, paddingTop: S.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
        <AppButton label="Zur Übersicht" variant="secondary" onPress={onBack} style={{ minWidth: 150 }} />
      </View>
      {primary.onPress && (
        <>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: C.textTertiary, marginBottom: 10 }}>NÄCHSTER SCHRITT</Text>
          <TouchableOpacity onPress={primary.onPress} activeOpacity={0.8}>
            <AppCard style={{ marginBottom: 12 }} padding={S.md} radius={R.lg} borderColor={processColors.border} backgroundColor={processColors.bg}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name={primary.icon} size={22} color={processColors.text} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: processColors.text }}>{primary.label}</Text>
                  <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 4 }}>
                    {primary.key === 'review'
                      ? 'Die wichtigsten Felder sollten zuerst kurz geprüft werden.'
                      : digitalTwin?.statusSummary || ACTION_HINT[primary.key] || getPrimaryAction(dok.typ).sublabel}
                  </Text>
                  {(primary.key === 'einspruch') && (
                    <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 6, fontStyle: 'italic' }}>
                      {NO_LEGAL_ADVICE_DISCLAIMER}
                    </Text>
                  )}
                </View>
                <Icon name="caret-right" size={16} color={processColors.text} />
              </View>
            </AppCard>
          </TouchableOpacity>
        </>
      )}

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
                  onPress={action.onPress}
                  disabled={!action.onPress}>
                  <Icon name={action.icon} size={20} color={tone.text} style={{ marginBottom: 4 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: tone.text }}>{action.shortLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {extras > 0 && (
        <TouchableOpacity onPress={onOpenMore}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: R.lg, paddingHorizontal: S.md, paddingVertical: 14,
            borderWidth: 0.5, borderColor: C.border, backgroundColor: C.bgCard }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="dots-three" size={18} color={C.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>
              Weitere Werkzeuge
            </Text>
          </View>
          <Icon name="caret-right" size={18} color={C.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
