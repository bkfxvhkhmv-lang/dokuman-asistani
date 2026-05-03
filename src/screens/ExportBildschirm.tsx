/**
 * ExportBildschirm — Accountable-style: Checkbox-Auswahl + ein CTA.
 * Nutzer wählt WAS exportiert wird, dann WANN, dann Export.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/store';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import Icon from '@/components/Icon';
import { collectSteuerpaketDokumente } from '@/services/export/steuerpaketExport';
import { exportiereTopluPDF } from '@/utils/exporters';
import { useToast } from '@/hooks/useToast';
import PremiumToast from '@/design/components/PremiumToast';
import type { Dokument } from '@/store';

// Export-Lila — eigene Sektionsfarbe (wie Accountable: jede Sektion hat eigene Farbe)
const EXPORT_COLOR   = '#6B21A8'; // tiefes Lila
const EXPORT_LIGHT   = '#F3E8FF';
const EXPORT_DARK    = '#581C87';
const EXPORT_GRAD_A  = '#7C3AED';
const EXPORT_GRAD_B  = '#5B21B6';

const AKTUELLES_JAHR = new Date().getFullYear();
const JAHRE = [AKTUELLES_JAHR, AKTUELLES_JAHR - 1, AKTUELLES_JAHR - 2];

type ExportOption = {
  id: string;
  label: string;
  description: string;
  icon: string;
  premium?: boolean;
  disabled?: boolean;
};

function buildExportOptions(T: (k: string) => string): ExportOption[] {
  return [
    {
      id: 'steuerpaket',
      label: 'Steuerpaket',
      description: T('export.no_steuer_body').replace('{year}', String(new Date().getFullYear())),
      icon: 'calculator',
      premium: true,
    },
    {
      id: 'pdf_alle',
      label: T('tab.documents'),
      description: T('export.subtitle'),
      icon: 'file-pdf',
      premium: false,
    },
    {
      id: 'originaldokumente',
      label: T('doc.scanned'),
      description: T('export.subtitle'),
      icon: 'files',
      premium: false,
    },
    // DATEV hidden — ENABLE_RELEASE_DATEV_EXPORT is false in SmartActionsService
  ];
}

function PremiumStar() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: '#FEF9C3', borderRadius: 999,
      paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10 }}>⭐</Text>
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400E' }}>PREMIUM</Text>
    </View>
  );
}

function ExportCheckRow({
  option,
  checked,
  onToggle,
  count,
}: {
  option: ExportOption;
  checked: boolean;
  onToggle: () => void;
  count?: number;
}) {
  const { Colors: C } = useTheme();
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: C.borderLight,
      }}
    >
      {/* Checkbox */}
      <View style={{
        width: 24, height: 24, borderRadius: 6,
        borderWidth: 2,
        borderColor: checked ? EXPORT_COLOR : C.border,
        backgroundColor: checked ? EXPORT_COLOR : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <Icon name="checkmark" size={14} color="#fff" />}
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>
            {option.label}
          </Text>
          {option.premium && <PremiumStar />}
          {count !== undefined && count > 0 && (
            <Text style={{ fontSize: 12, color: C.textSecondary }}>({count})</Text>
          )}
        </View>
        <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 18 }}>
          {option.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}


export default function ExportBildschirm() {
  const { state } = useStore();
  const { S, Colors: C } = useTheme();
  const { t: T } = useT();
  const EXPORT_OPTIONS = buildExportOptions(T);

  const [aktJahr, setAktJahr]     = useState(AKTUELLES_JAHR);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(false);
  const { config: toastConfig, show: showToast, hide: hideToast } = useToast();

  const dokumente = state.dokumente as Dokument[];
  const alleDoks  = useMemo(() => dokumente.filter(d => !d.erledigt), [dokumente]);

  const jahresDoks = useMemo(() =>
    alleDoks.filter(d => {
      try { return new Date(d.datum).getFullYear() === aktJahr; } catch { return false; }
    }), [alleDoks, aktJahr]);

  const steuerDoks = useMemo(() =>
    collectSteuerpaketDokumente(alleDoks, { jahr: aktJahr }),
    [alleDoks, aktJahr]);

  const counts: Record<string, number> = {
    steuerpaket:       steuerDoks.length,
    pdf_alle:          jahresDoks.length,
    originaldokumente: alleDoks.filter(d => !!d.uri).length,
  };

  const toggle = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (selected.size === 0) {
      showToast({ message: 'Keine Dokumente ausgewählt', tone: 'warning', icon: 'alert-circle-outline' });
      return;
    }
    setLoading(true);
    try {
      if (selected.has('steuerpaket')) {
        if (steuerDoks.length === 0) {
          showToast({ message: 'Keine Steuernachweise vorhanden', tone: 'warning', icon: 'alert-circle-outline' });
        } else {
          await exportiereTopluPDF(steuerDoks);
        }
      }
      if (selected.has('pdf_alle') || selected.has('originaldokumente')) {
        const docs = selected.has('pdf_alle') ? jahresDoks : alleDoks.filter(d => !!d.uri);
        if (docs.length === 0) {
          showToast({ message: `Für ${aktJahr} keine Belege gefunden`, tone: 'warning', icon: 'alert-circle-outline' });
        } else {
          await exportiereTopluPDF(docs);
        }
      }
    } catch (e: any) {
      console.warn('[ExportBildschirm]', e);
      if (e?.message === 'BRIEFPILOT_SHARING_UNAVAILABLE') {
        showToast({ message: 'Teilen nicht verfügbar', tone: 'danger', icon: 'alert-circle' });
      } else {
        showToast({ message: 'Export fehlgeschlagen', tone: 'danger', icon: 'alert-circle' });
      }
    } finally {
      setLoading(false);
    }
  }, [selected, steuerDoks, jahresDoks, alleDoks, aktJahr, showToast]);

  const canExport = selected.size > 0 && !loading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {/* Lila Header — Sektionsfarbe Export */}
      <LinearGradient
        colors={[EXPORT_GRAD_A, EXPORT_GRAD_B]}
        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
      >
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>
          {T('export.title')}
        </Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
          {T('export.subtitle')}
        </Text>

        {/* Jahr-Chips */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {JAHRE.map(j => {
            const sel = j === aktJahr;
            return (
              <TouchableOpacity
                key={j}
                onPress={() => setAktJahr(j)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: sel ? '#fff' : 'rgba(255,255,255,0.2)',
                }}
              >
                <Text style={{
                  fontSize: 14, fontWeight: '800',
                  color: sel ? EXPORT_DARK : '#fff',
                }}>
                  {j}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Checkbox Liste */}
        <View style={{
          marginHorizontal: 16, marginTop: 20,
          backgroundColor: C.bgCard,
          borderRadius: 16,
          borderWidth: 1, borderColor: C.borderLight,
          overflow: 'hidden',
        }}>
          {EXPORT_OPTIONS.map((opt, idx) => (
            <ExportCheckRow
              key={opt.id}
              option={opt}
              checked={selected.has(opt.id)}
              onToggle={() => toggle(opt.id)}
              count={counts[opt.id]}
            />
          ))}
        </View>

        {/* Info */}
        <View style={{ marginHorizontal: 16, marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Icon name="information-circle" size={16} color={C.textTertiary} />
          <Text style={{ flex: 1, fontSize: 12, color: C.textTertiary, lineHeight: 18 }}>
            Nicht sicher, was du brauchst? Für die Steuer empfehlen wir das{' '}
            <Text style={{ fontWeight: '700' }}>Steuerpaket</Text> — es enthält alle relevanten Belege des Jahres.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
        paddingTop: 12,
        paddingHorizontal: 16,
        backgroundColor: C.bg,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderLight,
      }}>
        {selected.size > 0 && (
          <Text style={{ textAlign: 'center', fontSize: 12, color: C.textSecondary, marginBottom: 8 }}>
            {T('export.cta_selected', { n: selected.size, s: selected.size !== 1 ? 'en' : '', year: String(aktJahr) })}
          </Text>
        )}
        <TouchableOpacity
          onPress={handleExport}
          disabled={!canExport}
          activeOpacity={0.85}
          style={{
            backgroundColor: canExport ? EXPORT_COLOR : C.borderLight,
            borderRadius: 14,
            paddingVertical: 17,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Icon name="export" size={20} color="#fff" />
          }
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>
            {loading ? 'Wird exportiert…' : T('export.cta')}
          </Text>
        </TouchableOpacity>
      </View>
      <PremiumToast config={toastConfig} onHide={hideToast} />
    </SafeAreaView>
  );
}
