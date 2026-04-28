/**
 * PostCaptureActionSheet — Command Deck
 *
 * Replaces the old utility-style action list.
 * Primary hierarchy:
 *   1. Brief erstellen  (full-width glowing CTA)
 *   2. 2×3 grid        (Ausfüllen · Risiko · Timeline · Archiv · Export · Bearbeiten)
 *
 * Optional `briefInsight` prop shows a Digital Twin pre-read before the user acts.
 * When not provided, shows a neutral "preparing" placeholder.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated,
  StyleSheet, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../../components/Icon';
import { WARNING } from '../constants';

const { width: W } = Dimensions.get('window');

const CYAN  = '#00C8FF';
const NAVY  = '#0D1117';
const CELL_W = Math.floor((W - 24 - 16) / 3);   // paddingH=12*2, 2 gaps of 8

// ── Action type ───────────────────────────────────────────────────────────────

export type PostCaptureAction =
  | 'brief'        // PRIMARY — full AI analysis + Brief screen
  | 'autofill'     // ✍️  Formular auto-befüllen
  | 'risk'         // ⚠️  Direkt zur Risikoanalyse
  | 'timeline'     // 🕒  In Timeline einordnen
  | 'archive'      // 📎  Nur speichern, kein Brief
  | 'export'       // 📤  Als PDF teilen / E-Mail
  | 'edit'         // 🛠  Weiter bearbeiten
  // legacy — kept for backward compat
  | 'analyse'
  | 'pdf_share'
  | 'email'
  | 'save_only';

// ── Grid action definitions ───────────────────────────────────────────────────

interface GridAction {
  id: PostCaptureAction;
  icon: string;
  label: string;
  color: string;
}

const GRID: GridAction[] = [
  { id: 'archive',  icon: 'archive',            label: 'Speichern',  color: '#34D399' },
  { id: 'risk',     icon: 'shield-check',        label: 'Risiko',     color: '#F87171' },
  { id: 'timeline', icon: 'clock',               label: 'Timeline',   color: '#60A5FA' },
  { id: 'export',   icon: 'share',               label: 'Export',     color: '#94A3B8' },
  { id: 'edit',     icon: 'sliders-horizontal',  label: 'Bearbeiten', color: '#6B7280' },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  visible:       boolean;
  pageCount:     number;
  briefInsight?: string;   // e.g. "Zahlungsaufforderung · 14 Tage · Risiko: Mittel"
  onSelect:      (action: PostCaptureAction) => void;
  onClose:       () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PostCaptureActionSheet({
  visible, pageCount, briefInsight, onSelect, onClose,
}: Props) {
  const insets     = useSafeAreaInsets();
  const slideY     = useRef(new Animated.Value(600)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const glowOp     = useRef(new Animated.Value(0.5)).current;
  const loopRef    = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY,     { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 300 }),
        Animated.timing(backdropOp, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOp, { toValue: 1.0, duration: 1100, useNativeDriver: true }),
          Animated.timing(glowOp, { toValue: 0.35, duration: 1100, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      loopRef.current = null;
      Animated.parallel([
        Animated.timing(slideY,     { toValue: 600, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOp, { toValue: 0,   duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageLabel = pageCount === 1
    ? '1 Seite erfasst'
    : `${pageCount} Seiten erfasst`;

  const insightColor = briefInsight ? WARNING : CYAN;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>

      {/* Backdrop */}
      <Animated.View style={[st.backdrop, { opacity: backdropOp }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          st.sheet,
          { paddingBottom: Math.max(insets.bottom + 8, 20), transform: [{ translateY: slideY }] },
        ]}
      >
        {/* ── Handle ─────────────────────────────────────────────── */}
        <View style={st.handle} />

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={st.header}>
          <View style={[st.statusBadge, { borderColor: CYAN + '44', backgroundColor: CYAN + '14' }]}>
            <View style={[st.statusDot, { backgroundColor: CYAN }]} />
            <Text style={[st.statusText, { color: CYAN }]}>{pageLabel} · OCR bereit</Text>
          </View>
          <Text style={st.title}>BRIEF READY</Text>
        </View>

        {/* ── Digital Twin insight ────────────────────────────────── */}
        <View style={st.insightCard}>
          <View style={[st.insightDot, { backgroundColor: insightColor }]} />
          <Text style={st.insightText}>
            {briefInsight ?? 'KI-Analyse wird vorbereitet · Dokument wird klassifiziert…'}
          </Text>
        </View>

        {/* ── PRIMARY CTA ─────────────────────────────────────────── */}
        <View style={st.primaryWrap}>
          {/* Pulsing glow ring */}
          <Animated.View
            pointerEvents="none"
            style={[st.primaryGlow, { opacity: glowOp }]}
          />
          <TouchableOpacity
            style={st.primaryBtn}
            onPress={() => onSelect('brief')}
            activeOpacity={0.82}
          >
            <View style={st.primaryIconWrap}>
              <Icon name="flash" size={22} color={CYAN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.primaryLabel}>Brief erstellen</Text>
              <Text style={st.primarySub}>KI analysiert · erklärt · priorisiert</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={CYAN + '99'} />
          </TouchableOpacity>
        </View>

        {/* ── SECONDARY GRID 2×3 ─────────────────────────────────── */}
        <View style={st.grid}>
          {GRID.map(a => (
            <TouchableOpacity
              key={a.id}
              style={[st.gridCell, { width: CELL_W }]}
              onPress={() => onSelect(a.id)}
              activeOpacity={0.7}
            >
              <View style={[st.gridIconWrap, {
                backgroundColor: a.color + '18',
                borderColor:     a.color + '30',
              }]}>
                <Icon name={a.icon} size={20} color={a.color} />
              </View>
              <Text style={st.gridLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Cancel ─────────────────────────────────────────────── */}
        <TouchableOpacity style={st.cancelBtn} onPress={onClose}>
          <Text style={st.cancelText}>Abbrechen</Text>
        </TouchableOpacity>

      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: NAVY,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    borderTopWidth:  1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 14, marginBottom: 0,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: 1.4,
  },

  // Insight
  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 16, marginBottom: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  insightDot: {
    width: 8, height: 8, borderRadius: 4,
    marginTop: 4, flexShrink: 0,
  },
  insightText: {
    flex: 1, color: 'rgba(255,255,255,0.55)',
    fontSize: 12, lineHeight: 18,
  },

  // Primary CTA
  primaryWrap: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  primaryGlow: {
    position: 'absolute',
    top: -8, bottom: -8, left: -8, right: -8,
    borderRadius: 30,
    backgroundColor: CYAN + '16',
    borderWidth: 1, borderColor: CYAN + '28',
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#0F1E2E',
    borderRadius: 20, padding: 16,
    borderWidth: 1.5, borderColor: CYAN + '55',
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 14,
  },
  primaryIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: CYAN + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: -0.3,
  },
  primarySub: {
    color: CYAN + 'AA', fontSize: 11, marginTop: 2, letterSpacing: 0.1,
  },

  // Secondary grid
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  gridCell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  gridIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  gridLabel: {
    color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600',
  },

  // Cancel
  cancelBtn: {
    marginHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: { color: 'rgba(255,255,255,0.30)', fontSize: 13, fontWeight: '600' },
});
