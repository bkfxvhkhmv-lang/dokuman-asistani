import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W } = Dimensions.get('window');
const ONBOARDING_KEY = '@briefpilot_onboarding_done';

interface ScanDemo {
  type: 'scan';
  schritte: { icon: string; label: string; desc: string }[];
}

interface RisikoDemo {
  type: 'risiko';
  beispiele: { risiko: string; label: string; farbe: string; titel: string; tage: string }[];
}

interface FristenDemo {
  type: 'fristen';
  events: { datum: string; titel: string; tage: number; risiko: string }[];
}

interface SucheDemo {
  type: 'suche';
  beispiele: string[];
}

interface PrivatDemo {
  type: 'privat';
  punkte: { icon: string; text: string }[];
}

type SlideDemo = ScanDemo | RisikoDemo | FristenDemo | SucheDemo | PrivatDemo;

interface Slide {
  id: string;
  emoji: string;
  titel: string;
  text: string;
  farbe: string;
  demo: SlideDemo | null;
}

const SLIDES: Slide[] = [
  {
    id: 'welcome', emoji: '📄', titel: 'Willkommen bei BriefPilot', farbe: '#534AB7', demo: null,
    text: 'Ihre KI-Assistentin für Briefe, Rechnungen und Behördendokumente.\nNie wieder wichtige Fristen verpassen.',
  },
  {
    id: 'scan', emoji: '📷', titel: 'Dokument scannen', farbe: '#7C6EF8',
    text: 'Einfach fotografieren — BriefPilot erkennt Typ, Betrag, Frist und IBAN automatisch.',
    demo: {
      type: 'scan',
      schritte: [
        { icon: '📷', label: 'Foto aufnehmen', desc: 'Kamera öffnen, Dokument fotografieren' },
        { icon: '🔍', label: 'KI erkennt Inhalt', desc: 'Betrag, Frist, Typ automatisch erkannt' },
        { icon: '✅', label: 'Gespeichert!', desc: 'Mit Erinnerung & Risikoanalyse' },
      ],
    },
  },
  {
    id: 'risiko', emoji: '🎯', titel: 'Automatische Risikoanalyse', farbe: '#E24B4A',
    text: 'Jedes Dokument bekommt eine Dringlichkeitsstufe — damit Sie sofort sehen, was zuerst wichtig ist.',
    demo: {
      type: 'risiko',
      beispiele: [
        { risiko: 'hoch',    label: '🔴 Dringend',            farbe: '#E24B4A', titel: 'Bußgeldbescheid · 48,50 €',   tage: '2 Tage' },
        { risiko: 'mittel',  label: '🟡 Diese Woche',          farbe: '#BA7517', titel: 'Finanzamt · 312,00 €',        tage: '5 Tage' },
        { risiko: 'niedrig', label: '🟢 Kein Handlungsbedarf', farbe: '#1D9E75', titel: 'Vodafone Rechnung · 89,95 €', tage: '12 Tage' },
      ],
    },
  },
  {
    id: 'fristen', emoji: '⏰', titel: 'Fristen nie vergessen', farbe: '#BA7517',
    text: 'Automatische Erinnerungen 3 Tage und 1 Tag vor Ablauf. Einspruchsfristen werden direkt berechnet.',
    demo: {
      type: 'fristen',
      events: [
        { datum: 'Mi, 16. Apr', titel: 'Bußgeld Zahlung', tage: 0, risiko: 'hoch' },
        { datum: 'Fr, 18. Apr', titel: 'Finanzamt Frist', tage: 2, risiko: 'mittel' },
        { datum: 'So, 20. Apr', titel: 'Vodafone SEPA',   tage: 4, risiko: 'niedrig' },
      ],
    },
  },
  {
    id: 'suche', emoji: '🔍', titel: 'Intelligente Suche', farbe: '#1D9E75',
    text: 'Suchen Sie in natürlicher Sprache — „über 100€ diese Woche" oder „überfällige Mahnungen".',
    demo: {
      type: 'suche',
      beispiele: ['"über 100€"', '"diese Woche fällig"', '"überfällig"', '"Bußgeld 2026"'],
    },
  },
  {
    id: 'privat', emoji: '🔒', titel: 'Sicher & privat', farbe: '#2C6FAC',
    text: 'Alle Daten bleiben auf Ihrem Gerät. Face ID Schutz, automatische Sicherung, kein Cloud-Zwang.',
    demo: {
      type: 'privat',
      punkte: [
        { icon: '📱', text: 'Alle Daten lokal auf Ihrem Gerät' },
        { icon: '🔐', text: 'Face ID / PIN App-Sperre' },
        { icon: '💾', text: 'Automatische JSON-Sicherung' },
        { icon: '🇩🇪', text: 'OCR nur über EU-konforme API' },
      ],
    },
  },
];

export async function onboardingGesehen(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
  return raw === 'true';
}

export async function onboardingAlsGesehen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

function DemoScan({ demo }: { demo: ScanDemo }) {
  const [aktiv, setAktiv] = useState(0);
  const steps = demo.schritte;
  return (
    <View style={{ width: '100%', marginTop: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
        {steps.map((_, i) => (
          <View key={i} style={{ width: aktiv >= i ? 28 : 8, height: 6, borderRadius: 3,
            backgroundColor: aktiv >= i ? '#fff' : 'rgba(255,255,255,0.3)' }} />
        ))}
      </View>
      {steps.map((s, i) => (
        <TouchableOpacity key={i} onPress={() => setAktiv(i)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
            borderRadius: 14, marginBottom: 8,
            backgroundColor: aktiv >= i ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
            borderWidth: 1, borderColor: aktiv >= i ? 'rgba(255,255,255,0.4)' : 'transparent' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20 }}>{aktiv >= i ? s.icon : '○'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{s.label}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{s.desc}</Text>
          </View>
          {aktiv >= i && <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text>}
        </TouchableOpacity>
      ))}
      {aktiv < steps.length - 1 && (
        <TouchableOpacity onPress={() => setAktiv(v => Math.min(v + 1, steps.length - 1))}
          style={{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Nächster Schritt →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DemoRisiko({ demo }: { demo: RisikoDemo }) {
  return (
    <View style={{ width: '100%', marginTop: 20, gap: 8 }}>
      {demo.beispiele.map((b, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
          borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)',
          borderLeftWidth: 4, borderLeftColor: b.farbe }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{b.titel}</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>Frist: {b.tage}</Text>
          </View>
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
            backgroundColor: b.farbe + '33', borderWidth: 1, borderColor: b.farbe }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{b.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function DemoFristen({ demo }: { demo: FristenDemo }) {
  const FARBEN: Record<string, string> = { hoch: '#E24B4A', mittel: '#BA7517', niedrig: '#1D9E75' };
  return (
    <View style={{ width: '100%', marginTop: 16, gap: 6 }}>
      {demo.events.map((e, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
          borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <View style={{ width: 44, alignItems: 'center' }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: FARBEN[e.risiko] }} />
            {i < demo.events.length - 1 && (
              <View style={{ width: 2, height: 24, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 4 }} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{e.titel}</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{e.datum}</Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: FARBEN[e.risiko] }}>
            {e.tage === 0 ? 'Heute!' : `${e.tage} T.`}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DemoSuche({ demo }: { demo: SucheDemo }) {
  const [aktiv, setAktiv] = useState<string | null>(null);
  return (
    <View style={{ width: '100%', marginTop: 20 }}>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12,
        marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
        <Text style={{ fontSize: 14, color: aktiv ? '#fff' : 'rgba(255,255,255,0.5)', fontStyle: aktiv ? 'normal' : 'italic' }}>
          {aktiv || 'Tippen Sie eine Suche ein…'}
        </Text>
      </View>
      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontWeight: '600', letterSpacing: 0.5 }}>
        BEISPIELE — ANTIPPEN
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {demo.beispiele.map((b, i) => (
          <TouchableOpacity key={i} onPress={() => setAktiv(b)}
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
              backgroundColor: aktiv === b ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
            <Text style={{ fontSize: 13, color: '#fff' }}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function DemoPrivat({ demo }: { demo: PrivatDemo }) {
  return (
    <View style={{ width: '100%', marginTop: 20, gap: 10 }}>
      {demo.punkte.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
          borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <Text style={{ fontSize: 22 }}>{p.icon}</Text>
          <Text style={{ fontSize: 13, color: '#fff', fontWeight: '500', flex: 1 }}>{p.text}</Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>✓</Text>
        </View>
      ))}
    </View>
  );
}

function SlideDemo({ slide }: { slide: Slide }) {
  if (!slide.demo) return null;
  switch (slide.demo.type) {
    case 'scan':    return <DemoScan demo={slide.demo as ScanDemo} />;
    case 'risiko':  return <DemoRisiko demo={slide.demo as RisikoDemo} />;
    case 'fristen': return <DemoFristen demo={slide.demo as FristenDemo} />;
    case 'suche':   return <DemoSuche demo={slide.demo as SucheDemo} />;
    case 'privat':  return <DemoPrivat demo={slide.demo as PrivatDemo} />;
    default: return null;
  }
}

interface OnboardingProps {
  visible: boolean;
  onFertig: () => void;
}

export default function Onboarding({ visible, onFertig }: OnboardingProps) {
  const [aktiv, setAktiv] = useState(0);
  const scrollRef = useRef<any>(null);

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * W, animated: true });
    setAktiv(idx);
  };

  const handleWeiter = async () => {
    if (aktiv < SLIDES.length - 1) {
      goTo(aktiv + 1);
    } else {
      await onboardingAlsGesehen();
      onFertig();
    }
  };

  const handleUeberspringen = async () => {
    await onboardingAlsGesehen();
    onFertig();
  };

  if (!visible) return null;

  const slide = SLIDES[aktiv];

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={[st.container, { backgroundColor: slide.farbe }]}>
        {aktiv < SLIDES.length - 1 && (
          <TouchableOpacity style={st.atla} onPress={handleUeberspringen}>
            <Text style={st.atlaText}>Überspringen</Text>
          </TouchableOpacity>
        )}
        <View style={st.counter}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' }}>
            {aktiv + 1} / {SLIDES.length}
          </Text>
        </View>

        <ScrollView ref={scrollRef} horizontal pagingEnabled scrollEnabled={false}
          showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          {SLIDES.map((s, i) => (
            <ScrollView key={i} style={{ width: W }} contentContainerStyle={st.slide}
              showsVerticalScrollIndicator={false}>
              <View style={st.emojiWrap}>
                <Text style={st.emoji}>{s.emoji}</Text>
              </View>
              <Text style={st.titel}>{s.titel}</Text>
              <Text style={st.text}>{s.text}</Text>
              {i === aktiv && <SlideDemo slide={s} />}
              <View style={{ height: 120 }} />
            </ScrollView>
          ))}
        </ScrollView>

        <View style={st.noktalar}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[st.nokta, aktiv === i && st.noktaAktiv,
                i < aktiv && { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={st.btn} onPress={handleWeiter} activeOpacity={0.85}>
          <Text style={st.btnText}>
            {aktiv === SLIDES.length - 1 ? '🚀  Jetzt starten' : 'Weiter  →'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  atla:      { position: 'absolute', top: 56, right: 24, zIndex: 10 },
  atlaText:  { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },
  counter:   { position: 'absolute', top: 56, left: 24, zIndex: 10 },
  slide:     { width: W, alignItems: 'center', paddingHorizontal: 28, paddingTop: 80, paddingBottom: 20 },
  emojiWrap: { width: 100, height: 100, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  emoji:     { fontSize: 48 },
  titel:     { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  text:      { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22 },
  noktalar:  { flexDirection: 'row', gap: 8, marginBottom: 20 },
  nokta:     { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  noktaAktiv: { width: 28, backgroundColor: '#fff' },
  btn:       { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)', borderRadius: 18, paddingHorizontal: 48, paddingVertical: 16 },
  btnText:   { fontSize: 16, fontWeight: '700', color: '#fff' },
});
