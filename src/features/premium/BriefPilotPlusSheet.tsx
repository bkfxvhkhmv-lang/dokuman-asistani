import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/ThemeContext';
import { usePremium } from '@/hooks/usePremium';

const FEATURES = [
  { icon: '✦', label: 'KI-Zusammenfassung',          sub: 'Jeder Brief auf den Punkt gebracht' },
  { icon: '⚖️', label: 'Einspruch prüfen & starten',  sub: 'Widerspruchs-Assistent mit Vorlagen' },
  { icon: '📤', label: 'PDF-Export & Teilen',          sub: 'Dokumente professionell weitergeben' },
  { icon: '🔔', label: 'Frist-Erinnerungen',           sub: 'Keine Deadline mehr verpassen' },
  { icon: '🔗', label: 'Dokument-Verknüpfungen',       sub: 'Zusammenhänge automatisch erkennen' },
];

const PLANS = [
  { id: 'monthly', label: 'Monatlich', price: '4,99 €', sub: 'monatlich kündbar',         badge: null },
  { id: 'yearly',  label: 'Jährlich',  price: '2,99 €', sub: 'pro Monat · 40 % Ersparnis', badge: 'BELIEBT' },
] as const;

type PlanId = 'monthly' | 'yearly';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BriefPilotPlusSheet({ visible, onClose }: Props) {
  const { Colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const { isPlus, activate } = usePremium();
  const [plan, setPlan]       = useState<PlanId>('yearly');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    await activate();
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={st.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View style={[st.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={[st.handle, { backgroundColor: C.border }]} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <LinearGradient
            colors={['#4361EE', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.header}
          >
            <Text style={st.headerSpark}>✦</Text>
            <Text style={st.headerTitle}>BriefPilot Plus</Text>
            <Text style={st.headerSub}>
              {isPlus ? 'Du bist bereits Plus-Mitglied.' : 'Alle KI-Funktionen. Kein Limit.'}
            </Text>
          </LinearGradient>

          {/* Features */}
          <View style={[st.featureBlock, { backgroundColor: C.bgCard, borderColor: C.borderLight }]}>
            {FEATURES.map((f, i) => (
              <View
                key={f.label}
                style={[
                  st.featureRow,
                  i < FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderLight },
                ]}
              >
                <Text style={st.featureIcon}>{f.icon}</Text>
                <View style={st.featureText}>
                  <Text style={[st.featureLabel, { color: C.text }]}>{f.label}</Text>
                  <Text style={[st.featureSub, { color: C.textSecondary }]}>{f.sub}</Text>
                </View>
                <Text style={[st.check, { color: '#4361EE' }]}>✓</Text>
              </View>
            ))}
          </View>

          {/* Plan toggle */}
          {!isPlus && (
            <View style={st.planRow}>
              {PLANS.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPlan(p.id)}
                  activeOpacity={0.85}
                  style={[
                    st.planCard,
                    {
                      borderColor:     plan === p.id ? '#4361EE' : C.borderLight,
                      backgroundColor: plan === p.id ? '#EEF1FD' : C.bgCard,
                    },
                  ]}
                >
                  {p.badge && (
                    <View style={st.planBadge}>
                      <Text style={st.planBadgeText}>{p.badge}</Text>
                    </View>
                  )}
                  <Text style={[st.planLabel, { color: C.text }]}>{p.label}</Text>
                  <Text style={[st.planPrice, { color: '#4361EE' }]}>{p.price}</Text>
                  <Text style={[st.planSub, { color: C.textSecondary }]}>{p.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* CTA */}
          {!isPlus && (
            <TouchableOpacity
              style={[st.cta, { opacity: loading ? 0.6 : 1 }]}
              onPress={handleActivate}
              disabled={loading}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#4361EE', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.ctaGrad}
              >
                <Text style={st.ctaText}>
                  {loading ? 'Wird aktiviert …' : '✦  Plus aktivieren'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isPlus && (
            <View style={st.alreadyPlus}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F5233' }}>
                ✓ Du bist Plus-Mitglied
              </Text>
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={st.skip}>
            <Text style={[st.skipText, { color: C.textTertiary }]}>
              {isPlus ? 'Schließen' : 'Vielleicht später'}
            </Text>
          </TouchableOpacity>

          <Text style={[st.legal, { color: C.textTertiary }]}>
            Kein verstecktes Abo. Jederzeit kündbar über die App-Store-Einstellungen.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:        {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#F5F4F0',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%', overflow: 'hidden',
  },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
  header:       { paddingHorizontal: 28, paddingTop: 28, paddingBottom: 28, alignItems: 'center', gap: 6 },
  headerSpark:  { fontSize: 28, color: '#FFD700', fontWeight: '800' },
  headerTitle:  { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.6 },
  headerSub:    { fontSize: 14, color: 'rgba(255,255,255,0.80)', textAlign: 'center' },
  featureBlock: { marginHorizontal: 16, marginTop: 14, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  featureRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  featureIcon:  { fontSize: 18, width: 28, textAlign: 'center' },
  featureText:  { flex: 1 },
  featureLabel: { fontSize: 14, fontWeight: '700' },
  featureSub:   { fontSize: 12, marginTop: 1 },
  check:        { fontSize: 16, fontWeight: '800' },
  planRow:      { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16 },
  planCard:     { flex: 1, borderRadius: 16, borderWidth: 2, padding: 14, alignItems: 'center', gap: 3 },
  planBadge:    { position: 'absolute', top: -10, right: 8, backgroundColor: '#4361EE', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  planBadgeText:{ fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  planLabel:    { fontSize: 13, fontWeight: '700' },
  planPrice:    { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  planSub:      { fontSize: 11, textAlign: 'center', lineHeight: 15 },
  cta:          { marginHorizontal: 16, marginTop: 20, borderRadius: 18, overflow: 'hidden' },
  ctaGrad:      { paddingVertical: 18, alignItems: 'center' },
  ctaText:      { fontSize: 17, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  alreadyPlus:  { marginHorizontal: 16, marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: '#5DCAA5', backgroundColor: '#E8F5EF', padding: 18, alignItems: 'center' },
  skip:         { alignItems: 'center', paddingVertical: 16 },
  skipText:     { fontSize: 14, fontWeight: '600' },
  legal:        { fontSize: 11, textAlign: 'center', paddingHorizontal: 32, paddingBottom: 8, lineHeight: 16 },
});
