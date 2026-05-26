import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { formatBetrag, formatFrist, getTageText, getTageVerbleibend } from '@/utils/formatters';
import { safeDisplayTitel } from '@/utils/displaySanitizer';
import type { Dokument } from '@/store';
import type { ActionPlan } from '@/features/detail/components/ActionsPanel';

type Props = {
  dok: Dokument;
  /** „Was soll ich tun?“ */
  naechsterSchritt: string | null;
  actionPlan: ActionPlan | null;
  onZahlen?: () => void;
  onKalender?: () => void;
  onHilfe?: () => void;
  /** Z. B. während Server-Analyse — keine Bezahl-/Kalender-CTAs. */
  deferPrimaryActions?: boolean;
};

export default function SimpleDocumentOverview({
  dok,
  naechsterSchritt,
  actionPlan,
  onZahlen,
  onKalender,
  onHilfe,
  deferPrimaryActions = false,
}: Props) {
  const { Colors: C, S, R } = useTheme();

  const tage = dok.frist ? getTageVerbleibend(dok.frist) : null;
  const rel = dok.frist ? getTageText(dok.frist) : null;
  const fristZeile = dok.frist
    ? `${formatFrist(dok.frist)}${rel ? ` (${rel})` : ''}`
    : 'Keine Frist angegeben';

  const zahlenSichtbar =
    !deferPrimaryActions &&
    !!onZahlen &&
    dok.betrag != null &&
    (dok.aktionen?.includes('zahlen') || actionPlan?.primary?.key === 'zahlen');

  const kalenderSichtbar =
    !deferPrimaryActions &&
    !!onKalender &&
    !!dok.frist &&
    !dok.erledigt &&
    tage !== null &&
    tage >= 0 &&
    !dok.fristImKalender;

  const conf = dok.confidence;
  const vertrauen =
    conf == null
      ? 'Automatisch erkannt'
      : conf >= 75
        ? 'KI-geprüft'
        : conf >= 55
          ? 'Angaben prüfen'
          : 'Einige Angaben prüfen';

  return (
    <View style={{ marginHorizontal: S.md, marginBottom: S.md, gap: S.md }}>
      <View
        style={{
          borderRadius: R.lg,
          overflow: 'hidden',
          backgroundColor: C.bgCard,
          borderWidth: 1,
          borderColor: C.borderLight,
          padding: S.lg,
          gap: S.md,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: '800', color: C.textTertiary, letterSpacing: 0.6 }}>
          WAS IST DAS?
        </Text>
        <Text style={{ fontSize: 20, fontWeight: '900', color: C.text }}>{dok.typ}</Text>
        <Text style={{ fontSize: 13, color: C.textSecondary }} numberOfLines={3}>
          {safeDisplayTitel(dok.titel, dok.typ, dok.confidence)}
        </Text>

        <View style={{ height: 1, backgroundColor: C.borderLight, marginVertical: 4 }} />

        <Text style={{ fontSize: 11, fontWeight: '800', color: C.textTertiary, letterSpacing: 0.6 }}>
          WAS SOLL ICH TUN?
        </Text>
        <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>
          {naechsterSchritt ?? 'Nichts Dringendes — bei Bedarf Hilfe nutzen'}
        </Text>

        <View style={{ height: 1, backgroundColor: C.borderLight, marginVertical: 4 }} />

        <Text style={{ fontSize: 11, fontWeight: '800', color: C.textTertiary, letterSpacing: 0.6 }}>
          BIS WANN?
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: tage !== null && tage < 0 ? C.danger : C.text,
          }}
        >
          {fristZeile}
        </Text>

        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: C.bgInput,
            borderWidth: 0.5,
            borderColor: C.border,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary }}>{vertrauen}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {zahlenSichtbar ? (
          <TouchableOpacity
            onPress={onZahlen}
            accessibilityRole="button"
            style={{
              flexGrow: 1,
              minWidth: '46%',
              paddingVertical: 14,
              borderRadius: R.lg,
              backgroundColor: C.primary,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Zahlung vorbereiten</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.92)', marginTop: 2 }}>
              {formatBetrag(dok.betrag!, dok.waehrung || '€')}
            </Text>
          </TouchableOpacity>
        ) : null}

        {kalenderSichtbar ? (
          <TouchableOpacity
            onPress={onKalender}
            accessibilityRole="button"
            style={{
              flexGrow: 1,
              minWidth: '46%',
              paddingVertical: 14,
              borderRadius: R.lg,
              backgroundColor: C.primaryLight,
              borderWidth: 1,
              borderColor: `${C.primary}66`,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.primaryDark }}>Kalender</Text>
          </TouchableOpacity>
        ) : null}

        {onHilfe ? (
          <TouchableOpacity
            onPress={onHilfe}
            accessibilityRole="button"
            style={{
              flexGrow: 1,
              minWidth: '46%',
              paddingVertical: 14,
              borderRadius: R.lg,
              backgroundColor: C.bgCard,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>Hilfe</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
