import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { FristenDemo, PrivatDemo, RisikoDemo, ScanDemo, Slide, SlideDemo, SucheDemo } from '@/components/onboarding/onboarding.types';

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
          {aktiv >= i ? <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text> : null}
        </TouchableOpacity>
      ))}
      {aktiv < steps.length - 1 ? (
        <TouchableOpacity onPress={() => setAktiv(v => Math.min(v + 1, steps.length - 1))}
          style={{ marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Nächster Schritt →</Text>
        </TouchableOpacity>
      ) : null}
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
            {i < demo.events.length - 1 ? (
              <View style={{ width: 2, height: 24, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 4 }} />
            ) : null}
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

export function OnboardingSlideDemo({ slide }: { slide: Slide }) {
  if (!slide.demo) return null;
  const d: SlideDemo = slide.demo;
  switch (d.type) {
    case 'scan':    return <DemoScan demo={d} />;
    case 'risiko':  return <DemoRisiko demo={d} />;
    case 'fristen': return <DemoFristen demo={d} />;
    case 'suche':   return <DemoSuche demo={d} />;
    case 'privat':  return <DemoPrivat demo={d} />;
    default: return null;
  }
}
